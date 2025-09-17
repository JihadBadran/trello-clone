import { ISODateTime } from '@tc/foundation/types';
import { OutboxItem, PullResult, PushResult } from '@tc/infra/sync-cloud';
import { Card } from './entities/card';


export interface CardsRepo {
  getAll(): Promise<Card[]>;
  upsert(c: Card): Promise<void>;
  remove(id: string): Promise<void>;
  push(batch: OutboxItem<Card>[]): Promise<PushResult>;
  pullSince(since: ISODateTime | null, limit: number): Promise<PullResult<Card>>;
  applyFromCloud(row: Card): Promise<void>;
}
