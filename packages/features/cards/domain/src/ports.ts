import { ISODateTime } from '@tc/foundation/types';
import { PullResult, PushResult } from '@tc/infra/sync-cloud';
import { OutboxItem } from "@tc/foundation/types";
import { Card } from './entities/card';


export interface CardsRepo {
  get(id: string): Promise<Card | null>;
  getAll(): Promise<Card[]>;
  upsert(c: Card): Promise<void>;
  remove(id: string): Promise<void>;
  push(batch: OutboxItem<Card>[]): Promise<PushResult>;
  pullSince(since: ISODateTime | null, limit: number): Promise<PullResult<Card>>;
  applyFromCloud(row: Card): Promise<void>;
}
