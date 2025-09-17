import type {
  ControllerConfig,
  ChannelConfig,
  ISODateTime,
  Millis,
  PushResult,
  PullResult,
} from './types'

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
const withJitter = (ms: number, jitter: number) => {
  if (jitter <= 0) return ms
  const delta = ms * jitter
  return Math.round(ms + (Math.random() * 2 - 1) * delta)
}

/**
 * MultiSyncController
 * - Periodically:
 *   1) drains outbox per topic -> cloud (batched)
 *   2) pulls cloud changes since cursor -> apply locally (LWW handled in repo)
 * - Retries transient failures with exponential backoff + jitter.
 * - Exposes pause/resume and a manual tick() for tests.
 */
export class MultiSyncController {
  private readonly channels: ChannelConfig[]
  private readonly outbox
  private readonly cursor
  private readonly schedule
  private readonly now
  private readonly pushBatchSize
  private readonly pullBatchSize
  private readonly baseIntervalMs
  private readonly maxBackoffMs
  private readonly jitter
  private readonly log

  private timer: { cancel: () => void } | null = null
  private running = false
  private paused = false
  private backoff = 0 // current backoff ms (0 means no backoff)
  private lastRunAt = 0

  constructor(cfg: ControllerConfig) {
    // de-dupe topics & freeze layout
    const seen = new Set<string>()
    this.channels = Object.values(cfg.channels).map((c) => {
      if (seen.has(c.topic)) throw new Error(`Duplicate topic: ${c.topic}`)
      seen.add(c.topic)
      return c
    })

    this.outbox = cfg.outbox
    this.cursor = cfg.cursor
    this.schedule = cfg.schedule
    this.now = cfg.now ?? (() => Date.now())
    this.pushBatchSize = cfg.pushBatchSize ?? 50
    this.pullBatchSize = cfg.pullBatchSize ?? 200
    this.baseIntervalMs = cfg.baseIntervalMs ?? 5000
    this.maxBackoffMs = cfg.maxBackoffMs ?? 60_000
    this.jitter = cfg.jitter ?? 0.2
    this.log = cfg.log ?? (() => {})
  }

  /** Start periodic sync */
  start(initialDelayMs?: Millis) {
    if (this.running) return
    this.running = true
    const delay = typeof initialDelayMs === 'number' ? initialDelayMs : 0
    this.queueNext(delay)
  }

  /** Stop periodic sync */
  stop() {
    this.running = false
    this.timer?.cancel()
    this.timer = null
  }

  /** Pause new cycles (in-flight tick still runs) */
  pause() { this.paused = true }
  /** Resume cycles */
  resume() { if (this.paused) { this.paused = false; this.queueNext(0) } }

  /** Manual trigger (awaits a full pass across all channels) */
  async tick(): Promise<void> {
    if (!this.running || this.paused) return
    try {
      await this.runOnce()
      // success resets backoff
      this.backoff = 0
      this.queueNext(this.baseIntervalMs)
    } catch (err) {
      // transient or unknown error → increase backoff
      this.backoff = this.nextBackoff(this.backoff)
      const delay = withJitter(this.backoff, this.jitter)
      this.log('[sync] tick failed; backing off', { delay, err })
      this.queueNext(delay)
    }
  }

  private queueNext(ms: number) {
    if (!this.running) return
    this.timer?.cancel()
    const delay = withJitter(ms, this.jitter)
    this.timer = this.schedule(() => { this.tick() }, delay)
  }

  private nextBackoff(prev: number) {
    const next = prev === 0 ? this.baseIntervalMs : prev * 2
    return clamp(next, this.baseIntervalMs, this.maxBackoffMs)
  }

  private async runOnce() {
    this.lastRunAt = this.now()

    // 1) PUSH outbox per topic (small batches; loop until empty or a transient failure)
    for (const ch of this.channels) {
      await this.pushOutboxBatches(ch)
    }

    // 2) PULL changes per topic until up-to-date or transient failure
    for (const ch of this.channels) {
      await this.pullSinceCursor(ch)
    }
  }

  private async pushOutboxBatches(ch: ChannelConfig) {
    while (true) {
      const batch = await this.outbox.readNextBatch(ch.topic, this.pushBatchSize)
      if (!batch.length) return

      const res: PushResult = await ch.cloud.push(batch)
      if (!res.ok) {
        if (res.transient) throw res.error ?? new Error('transient push error')
        // permanent failure → ack to avoid blocking; but log it
        this.log('[sync] permanent push failure, dropping', { topic: ch.topic, error: res.error })
        // best effort ack all to prevent dead loop
        await this.outbox.ack(batch.map((b) => b.id))
        return
      }

      const ackIds = res.ackIds?.length ? res.ackIds : batch.map((b) => b.id)
      await this.outbox.ack(ackIds)

      // if cloud accepted less than batch size, continue anyway; readNextBatch will fetch more or empty
      if (batch.length < this.pushBatchSize) {
        // probably near-empty; let loop continue to clear remaining quickly
      }
      // loop continues until readNextBatch returns []
    }
  }

  private async pullSinceCursor(ch: ChannelConfig) {
    let cursor = await this.cursor.get(ch.topic)
    // keep pulling until empty page
    while (true) {
      const res: PullResult = await ch.cloud.pullSince(cursor, this.pullBatchSize)
      if (!res.ok) {
        if (res.transient) throw res.error ?? new Error('transient pull error')
        // permanent error => stop pulls for this topic this round
        this.log('[sync] permanent pull failure', { topic: ch.topic, error: res.error })
        return
      }

      const rows = res.rows ?? []
      if (!rows.length) {
        // advance cursor if cloud told us a newer one explicitly
        if (res.cursor) await this.cursor.set(ch.topic, res.cursor)
        return
      }

      // apply rows (LWW is done inside local repo)
      for (const row of rows) {
        await ch.local.applyFromCloud(row)
      }

      // advance cursor: prefer server-provided cursor; otherwise use max(updatedAt)
      if (res.cursor) {
        cursor = res.cursor
        await this.cursor.set(ch.topic, cursor)
      } else {
        const maxUpdatedAt = this.pickMaxUpdatedAt(rows) ?? cursor
        if (maxUpdatedAt && maxUpdatedAt !== cursor) {
          cursor = maxUpdatedAt
          await this.cursor.set(ch.topic, cursor)
        }
      }

      // if we got a full page, loop to get more; otherwise we’re done
      if (rows.length < this.pullBatchSize) return
    }
  }

  private pickMaxUpdatedAt(rows: any[]): ISODateTime | null {
    let max: ISODateTime | null = null
    for (const r of rows) {
      const ts: ISODateTime | undefined = r.updated_at ?? r.updatedAt
      if (!ts) continue
      if (!max || ts > max) max = ts
    }
    return max
  }
}