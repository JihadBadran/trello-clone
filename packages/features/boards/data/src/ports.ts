import type { Board } from '@tc/boards/domain';
import { PullResult, PushResult } from '@tc/infra/sync-cloud';
import { OutboxItem } from "@tc/foundation/types";

export interface BoardsRepo {
  get(id: string): Promise<Board | null>;
  getAll(): Promise<Board[]>;
  upsert(b: Board): Promise<void>;
  remove(id: string): Promise<void>;
  archive(id: string): Promise<void>;
  push(batch: OutboxItem<Board>[]): Promise<PushResult>;
  pullSince(since: string | null, limit: number): Promise<PullResult<Board>>;
  applyFromCloud(row: Board): Promise<void>;
}