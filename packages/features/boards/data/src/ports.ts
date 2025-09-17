import type { Board } from '@tc/boards/domain';
import { OutboxItem, PullResult, PushResult } from '@tc/infra/sync-cloud';

export interface BoardsRepo {
  getAll(): Promise<Board[]>;
  upsert(b: Board): Promise<void>;
  remove(id: string): Promise<void>;
  archive(id: string): Promise<void>;
  push(batch: OutboxItem<Board>[]): Promise<PushResult>;
  pullSince(since: string | null, limit: number): Promise<PullResult<Board>>;
  applyFromCloud(row: Board): Promise<void>;
}