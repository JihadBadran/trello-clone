import { ISODateTime } from '@tc/foundation/types';
import { OutboxItem, PullResult, PushResult } from '@tc/infra/sync-cloud';
import { Column } from '@tc/columns/domain';


export interface ColumnsRepo {
  getAll(): Promise<Column[]>;
  upsert(c: Column): Promise<void>;
  remove(id: string): Promise<void>;
  push(batch: OutboxItem<Column>[]): Promise<PushResult>;
  pullSince(since: ISODateTime | null, limit: number): Promise<PullResult<Column>>;
  applyFromCloud(row: Column): Promise<void>;
}
