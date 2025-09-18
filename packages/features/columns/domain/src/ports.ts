import { ISODateTime, OutboxItem } from '@tc/foundation/types';
import { PullResult, PushResult } from '@tc/infra/sync-cloud';
import { Column } from './entities/column';


export interface ColumnsRepo {
  get(id: string): Promise<Column | null>;
  getAll(boardId: string): Promise<Column[]>;
  upsert(column: Column): Promise<void>;
  remove(id: string): Promise<void>;
  push(batch: OutboxItem<Column>[]): Promise<PushResult>;
  pullSince(since: ISODateTime | null, limit: number): Promise<PullResult<Column>>;
  applyFromCloud(column: Column): Promise<void>;
}
