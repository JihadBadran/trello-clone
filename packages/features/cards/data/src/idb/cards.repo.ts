import { STORES, getAll, put, del } from '@tc/infra/idb';
import { enqueue } from '@tc/infra/idb';
import type { Card } from '@tc/cards/application';
import { CardsRepo } from '@tc/cards/application';
import { OutboxItem, PushResult } from '@tc/infra/sync-cloud';

export const CardsRepoIDB: CardsRepo = {
  async getAll(): Promise<Card[]> {
    return await getAll<Card>(STORES.CARDS);
  },
  async upsert(c: Card) {
    await put(STORES.CARDS, c);
    await enqueue('cards', 'upsert', c);
  },
  async remove(id: string): Promise<void> {
    await del(STORES.CARDS, id);
    await enqueue('cards', 'remove', { id });
  },
  async applyFromCloud(row: Card): Promise<void> {
    await put(STORES.CARDS, row);
  },
  async push(batch: OutboxItem<Card>[]): Promise<PushResult> {
    console.log('pushing cards', batch);
    return Promise.resolve({ ok: true, ackIds: batch.map((i) => i.id) });
  },
  async pullSince(since, limit) {
    console.log('pulling cards since', since, limit);
    return Promise.resolve({ ok: true, rows: [], cursor: new Date().toISOString() });
  },
};
