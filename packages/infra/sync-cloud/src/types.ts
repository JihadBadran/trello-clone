export type Millis = number
export type ISODateTime = string

export type TopicName = string

export type OutboxOp = 'upsert' | 'delete' | string

import { OutboxItem } from '@tc/foundation/types';

export type PushResult = {
  ok: boolean
  transient?: boolean     // true => retry with backoff
  error?: unknown
  ackIds?: string[]       // which outbox ids were accepted by cloud
}

export type PullResult<T = unknown> = {
  ok: boolean
  transient?: boolean
  error?: unknown
  rows?: T[]              // entities from cloud
  cursor?: ISODateTime    // waterline after this pull
}

export interface LocalRepo {
  /** Apply a cloud row into local store (IDB). Should be idempotent + LWW. */
  applyFromCloud(row: unknown): Promise<void>
}

export interface CloudRepo {
  /** Push a batch of outbox items to cloud. Must be idempotent server-side. */
  push(items: OutboxItem[]): Promise<PushResult>
  /** Pull rows changed since cursor (inclusive/exclusive is up to impl). */
  pullSince(since: ISODateTime | null, limit: number): Promise<PullResult>
  /** Pull all rows for a topic. */
  getAll(): Promise<PullResult>
}

export interface OutboxApi {
  /** Read next batch of items for a topic, ordered by enqueue time/id. */
  readNextBatch(topic: TopicName, limit?: number): Promise<OutboxItem[]>
  /** Acknowledge (remove/mark) processed outbox items. */
  ack(ids: string[]): Promise<void>
}

export interface CursorApi {
  /** Read last successful cursor for a topic (or null). */
  get(topic: TopicName): Promise<ISODateTime | null>
  /** Persist last successful cursor for a topic. */
  set(topic: TopicName, value: ISODateTime): Promise<void>
}

export type ChannelConfig = {
  topic: TopicName
  local: LocalRepo
  cloud: CloudRepo
}

export type Scheduler = (fn: () => void, ms: Millis) => { cancel: () => void }

export type ControllerConfig = {
  channels: Record<string, ChannelConfig> // key is a readable name, must have unique topic
  outbox: OutboxApi
  cursor: CursorApi
  /** called to schedule the next tick (setTimeout-like) */
  schedule: Scheduler
  /** monotonic clock (Date.now by default) */
  now?: () => Millis
  /** max size for outbox push batch (default 50) */
  pushBatchSize?: number
  /** max rows per pull (default 200) */
  pullBatchSize?: number
  /** base polling interval when idle (default 5000ms) */
  baseIntervalMs?: Millis
  /** max backoff (default 60_000ms) */
  maxBackoffMs?: Millis
  /** jitter ratio 0..1 (default 0.2) */
  jitter?: number
  /** optional logger */
  log?: (msg: string, data?: unknown) => void
}