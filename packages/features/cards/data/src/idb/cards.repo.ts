import { STORES, getAll, put, del, get as idbGet } from '@tc/infra/idb';
import { enqueue } from '@tc/infra/idb';
import type { Card } from '@tc/cards/domain';
import { PushResult, PullResult, FeatureRepo, ISODateTime } from '@tc/foundation/types';
import { OutboxItem } from "@tc/foundation/types";

export class CardsRepoIDB implements FeatureRepo<Card> {
  public onApply?: (item: Card) => void;

  constructor(onApply?: (item: Card) => void) {
    this.onApply = onApply;
  }
  async get(id: string): Promise<Card | null> {
    return await idbGet(STORES.CARDS, id);
  }
  async getAll(): Promise<PullResult<Card>> {
    const rows = await getAll(STORES.CARDS);
    return { ok: true, rows };
  }
  async putLocal(c: Card) {
    await put(STORES.CARDS, c);
  }
  async enqueueUpsert(c: Card) {
    await enqueue('cards', 'upsert', c);
  }
  async upsert(c: Card) {
    await this.putLocal(c);
    await this.enqueueUpsert(c);
  }
  async removeLocal(id: string): Promise<void> {
    await del(STORES.CARDS, id);
  }
  async enqueueRemove(id: string): Promise<void> {
    await enqueue('cards', 'remove', { id });
  }
  async remove(id: string): Promise<void> {
    await this.removeLocal(id);
    await this.enqueueRemove(id);
  }
  async applyFromCloud(row: Card): Promise<void> {
    await put(STORES.CARDS, row);
    this.onApply?.(row);
  }
  async push(batch: OutboxItem<Card>[]): Promise<PushResult> {
    console.log('pushing cards', batch);
    return Promise.resolve({ ok: true, ackIds: batch.map((i) => i.id) });
  }
  async pullSince(since: ISODateTime | null, limit: number): Promise<PullResult<Card>> {
    console.log('pulling cards since', since, limit);
    return Promise.resolve({ ok: true, rows: [], cursor: new Date().toISOString() as ISODateTime });
  }
};

export const cardsRepoIDB = new CardsRepoIDB();
