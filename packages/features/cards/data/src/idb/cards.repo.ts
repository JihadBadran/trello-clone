import { STORES, getAll, put, del, get as idbGet } from '@tc/infra/idb';
import { enqueue } from '@tc/infra/idb';
import type { Card } from '@tc/cards/domain';
import { CardsRepo } from '@tc/cards/domain';
import { PushResult, PullResult } from '@tc/infra/sync-cloud';
import { OutboxItem } from "@tc/foundation/types";

export const CardsRepoIDB: CardsRepo = {
  async get(id: Card['id']) {
    return await idbGet(STORES.CARDS, id);
  },
  async getAll(): Promise<PullResult<Card>> {
    const rows = await getAll(STORES.CARDS);
    return { ok: true, rows };
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
