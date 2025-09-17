import { STORES, getAll, put, del } from '@tc/infra/idb';
import { enqueue } from '@tc/infra/idb';
import type { Column } from '@tc/columns/application';
import { ColumnsRepo } from '@tc/columns/application';
import { OutboxItem, PushResult } from '@tc/infra/sync-cloud';

export const ColumnsRepoIDB: ColumnsRepo = {
  async getAll(): Promise<Column[]> {
    return await getAll<Column>(STORES.COLUMNS);
  },
  async upsert(c: Column) {
    await put(STORES.COLUMNS, c);
    await enqueue('columns', 'upsert', c);
  },
  async remove(id: string): Promise<void> {
    await del(STORES.COLUMNS, id);
    await enqueue('columns', 'remove', { id });
  },
  async applyFromCloud(row: Column): Promise<void> {
    await put(STORES.COLUMNS, row);
  },
  async push(batch: OutboxItem<Column>[]): Promise<PushResult> {
    console.log('pushing columns', batch);
    return Promise.resolve({ ok: true, ackIds: batch.map((i) => i.id) });
  },
  async pullSince(since, limit) {
    console.log('pulling columns since', since, limit);
    return Promise.resolve({ ok: true, rows: [], cursor: new Date().toISOString() });
  },
};
