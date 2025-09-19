import { PullResult, PushResult } from '@tc/infra/sync-cloud';
import { ISODateTime } from './time';

/** A generic record for the outbox. */
export type OutboxItem<T = unknown> = {
  id: string;
  topic: string;
  op: 'upsert' | 'remove';
  payload: T;
  at: number;
};

export interface FeatureRepo<T> {
  get(id: string): Promise<T | null>;
  getAll(): Promise<PullResult<T>>;
  upsert(item: T): Promise<void>;
  remove(id: string): Promise<void>;
  push(batch: OutboxItem<T>[]): Promise<PushResult>;
  pullSince(since: ISODateTime | null, limit: number): Promise<PullResult<T>>;
  applyFromCloud(row: T): Promise<void>;
}
