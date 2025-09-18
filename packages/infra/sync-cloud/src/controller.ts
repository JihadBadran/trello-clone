import type {
  ControllerConfig,
  ChannelConfig,
  ISODateTime,
  Millis,
  PushResult,
  PullResult,
} from './types'
import type { OutboxItem } from '@tc/foundation/types'

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
  protected lastRunAt = 0

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
    console.log('[sync] start', { initialDelayMs })
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
    console.log('[sync] tick', { running: this.running, paused: this.paused })
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

  protected async runOnce() {
    this.lastRunAt = this.now()

    // 1) PUSH outbox per topic (small batches; loop until empty or a transient failure)
    const pushedByTopic = new Map<string, boolean>()
    for (const ch of this.channels) {
      const didPush = await this.pushOutboxBatches(ch)
      pushedByTopic.set(ch.topic, didPush)
    }

    // 2) PULL changes per topic only when needed:
    //    - initial hydration (no cursor yet)
    //    - or after a successful push that acknowledged items
    for (const ch of this.channels) {
      const cursor = await this.cursor.get(ch.topic)
      const needInitialPull = !cursor
      const didPush = pushedByTopic.get(ch.topic) === true
      if (needInitialPull || didPush) {
        await this.pullSinceCursor(ch)
      }
    }
  }

  private async pushOutboxBatches(ch: ChannelConfig): Promise<boolean> {
    console.log('[sync] pushOutboxBatches', { topic: ch.topic })
    let ackedAny = false
    // Track latest entity timestamp across loops to handle duplicates spanning batches
    type EntityLike = { id?: string; updated_at?: string; updatedAt?: string }
    const seenLatest = new Map<string, { ts: number; at: number; outboxId: string }>()
    const getTs = (it: OutboxItem) => {
      const p = it.payload as unknown as EntityLike | undefined
      const ts: string | undefined = p?.updated_at ?? p?.updatedAt
      return ts ? Date.parse(ts) : Number.NEGATIVE_INFINITY
    }
    while (true) {
      const rawBatch = await this.outbox.readNextBatch(ch.topic, this.pushBatchSize)
      console.log('[sync] batch', { rawBatch })
      if (!rawBatch.length) return ackedAny

      // Deduplicate within the batch by entity id using updated_at (LWW).
      const { deduped, ackAlso } = this.dedupeByEntity(rawBatch)
      // Further prune against previously-seen winners across earlier loops
      const pruned: OutboxItem[] = []
      const ackAcrossBatches: string[] = []
      for (const it of deduped) {
        const p = it.payload as unknown as EntityLike | undefined
        const id = p?.id
        if (!id) { pruned.push(it); continue }
        const ts = getTs(it)
        const prev = seenLatest.get(id)
        if (!prev || ts > prev.ts || (ts === prev.ts && it.at > prev.at)) {
          seenLatest.set(id, { ts, at: it.at, outboxId: it.id })
          pruned.push(it)
        } else {
          // Older than what we already sent/will send this tick → ack it
          ackAcrossBatches.push(it.id)
        }
      }
      const res: PushResult = await ch.cloud.push(pruned)
      if (!res.ok) {
        if (res.transient) throw res.error ?? new Error('transient push error')
        // permanent failure → do NOT ack; keep items for future retries
        this.log('[sync] permanent push failure (no ack). Keeping outbox items.', { topic: ch.topic, error: res.error })
        return ackedAny
      }

      // Ack all items that were deduplicated out in addition to server-acknowledged items
      const serverAckIds = Array.isArray(res.ackIds) ? res.ackIds : []
      const allAckIds = Array.from(new Set([ ...serverAckIds, ...ackAlso, ...ackAcrossBatches ]))
      if (allAckIds.length === 0) {
        this.log('[sync] push ok but no ackIds returned; not clearing outbox (will retry later)', { topic: ch.topic })
        return ackedAny
      }
      await this.outbox.ack(allAckIds)
      ackedAny = true

      // if cloud accepted less than batch size, continue anyway; readNextBatch will fetch more or empty
      if (rawBatch.length < this.pushBatchSize) {
        // probably near-empty; let loop continue to clear remaining quickly
      }
      // loop continues until readNextBatch returns []
    }
  }

  /**
   * Deduplicate outbox items by entity id using updated_at (LWW). If timestamps tie,
   * prefer the item enqueued later (higher `at`). Returns the deduped items to send
   * and a list of outbox ids to ack as duplicates.
   */
  private dedupeByEntity(items: OutboxItem[]): { deduped: OutboxItem[]; ackAlso: string[] } {
    type EntityLike = { id?: string; updated_at?: string; updatedAt?: string }
    const byId = new Map<string, OutboxItem>()
    const ackAlso: string[] = []

    const getTs = (it: OutboxItem) => {
      const p = it.payload as unknown as EntityLike | undefined
      const ts: string | undefined = p?.updated_at ?? p?.updatedAt
      return ts ? Date.parse(ts) : Number.NEGATIVE_INFINITY
    }

    for (const it of items) {
      const p = it.payload as unknown as EntityLike | undefined
      const id: string | undefined = p?.id
      // If no entity id present, treat as unique record
      if (!id) {
        byId.set(it.id, it)
        continue
      }
      const prev = byId.get(id)
      if (!prev) {
        byId.set(id, it)
      } else {
        const tPrev = getTs(prev)
        const tCur = getTs(it)
        if (tCur > tPrev || (tCur === tPrev && it.at > prev.at)) {
          // current wins → ack previous
          ackAlso.push(prev.id)
          byId.set(id, it)
        } else {
          // previous wins → ack current
          ackAlso.push(it.id)
        }
      }
    }

    return { deduped: Array.from(byId.values()), ackAlso }
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