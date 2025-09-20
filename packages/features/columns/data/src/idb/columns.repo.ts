import { STORES, getAll, put, del, get as idbGet } from '@tc/infra/idb';
import { enqueue } from '@tc/infra/idb';
import type { Column } from '@tc/columns/domain';
import { PushResult, PullResult, FeatureRepo, ISODateTime } from '@tc/foundation/types';
import { OutboxItem } from "@tc/foundation/types";

export class ColumnsRepoIDB implements FeatureRepo<Column> {
  public onApply?: (item: Column) => void;

  constructor(onApply?: (item: Column) => void) {
    this.onApply = onApply;
  }
  async get(id: string): Promise<Column | null> {
    const col = await idbGet(STORES.COLUMNS, id);
    return col ? (col as Column) : null;
  }
  async getAll(): Promise<PullResult<Column>> {
    const rows = await getAll(STORES.COLUMNS);
    return { ok: true, rows };
  }
  async putLocal(c: Column) {
    await put(STORES.COLUMNS, c);
  }
  async enqueueUpsert(c: Column) {
    await enqueue('columns', 'upsert', c);
  }
  async upsert(c: Column) {
    await this.putLocal(c);
    await this.enqueueUpsert(c);
  }
  async removeLocal(id: string): Promise<void> {
    await del(STORES.COLUMNS, id);
  }
  async enqueueRemove(id: string): Promise<void> {
    await enqueue('columns', 'remove', { id });
  }
  async remove(id: string): Promise<void> {
    await this.removeLocal(id);
    await this.enqueueRemove(id);
  }
  async applyFromCloud(row: Column): Promise<void> {
    await put(STORES.COLUMNS, row);
    this.onApply?.(row);
  }
  async push(batch: OutboxItem<Column>[]): Promise<PushResult> {
    console.log('pushing columns', batch);
    return Promise.resolve({ ok: true, ackIds: batch.map((i) => i.id) });
  }
  async pullSince(since: string | null, limit: number) {
    console.log('pulling columns since', since, limit);
    return Promise.resolve({ ok: true, rows: [], cursor: new Date().toISOString() as ISODateTime });
  }
};

export const columnsRepoIDB = new ColumnsRepoIDB();
