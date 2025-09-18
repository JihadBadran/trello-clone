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
    await store?.add?.(record);
  });
}

/** Read up to N records (FIFO-ish using the raw store order). */
export async function readOutbox(topic: string, limit = 100): Promise<OutboxItem[]> {
  return await withTx('readonly', STORES.OUTBOX, async (tx) => {
    console.log('[sync] readOutbox 0', { topic, limit })
    const store = tx.objectStore(STORES.OUTBOX);
    console.log('[sync] readOutbox 1', { topic, limit })
    try {
      const all = await store.index('topic').getAll(topic);
      const sorted = (all as OutboxItem[]).sort((a, b) => b.at - a.at);
      console.log('[sync] readOutbox 2', { topic, limit, count: sorted.length })
      return sorted.slice(0, limit);
    } catch (err) {
      // Fallback for older DBs missing the 'topic' index; remove once all clients are on v4+
      console.warn('[sync] readOutbox fallback (missing index \'topic\')', err)
      const all = (await store.getAll()) as OutboxItem[]
      const filtered = all.filter((r) => r.topic === topic)
      const sorted = filtered.sort((a, b) => b.at - a.at)
      console.log('[sync] readOutbox 2-fallback', { topic, limit, count: sorted.length })
      return sorted.slice(0, limit)
    }
  });
}

/** Clear records by string key. */
export async function clearOutbox(ids: string[]) {
  if (ids.length === 0) return;
  await withTx('readwrite', STORES.OUTBOX, async (tx) => {
    const store = tx.objectStore(STORES.OUTBOX);
    for (const id of ids) {
      await store?.delete?.(id);
    }
  });
}