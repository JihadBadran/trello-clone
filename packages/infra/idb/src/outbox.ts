import { withTx } from './client';
import { STORES } from './schema';
import { customAlphabet } from 'nanoid';
import type { OutboxItem } from '@tc/foundation/types';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21);

/** Enqueue a generic outbox record. */
export async function enqueue(topic: string, op: 'upsert' | 'remove', payload: unknown) {
  const record: OutboxItem = {
    id: nanoid(),
    topic,
    op,
    payload,
    at: Date.now(),
  };
  await withTx('readwrite', STORES.OUTBOX, async (tx) => {
    const store = tx.objectStore(STORES.OUTBOX);
    if (!store) throw new Error('Outbox store not found');
    await store.add(record);
  });
}

/** Read up to N records (FIFO-ish using the raw store order). */
export async function readOutbox(topic: string, limit = 100): Promise<OutboxItem[]> {
  return await withTx('readonly', STORES.OUTBOX, async (tx) => {
    const store = tx.objectStore(STORES.OUTBOX);
    const all = await store.index('topic').getAll(topic);
    return (all as OutboxItem[]).slice(0, limit);
  });
}

/** Clear records by string key. */
export async function clearOutbox(ids: string[]) {
  if (ids.length === 0) return;
  await withTx('readwrite', STORES.OUTBOX, async (tx) => {
    const store = tx.objectStore(STORES.OUTBOX);
    if (!store) throw new Error('Outbox store not found');
    for (const id of ids) {
      await store.delete(id);
    }
  });
}