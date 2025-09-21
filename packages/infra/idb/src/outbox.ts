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

  console.log(`[Outbox] Enqueueing ${topic}/${op}:`, record);

  try {
    await withTx('readwrite', STORES.OUTBOX, async (tx) => {
      const store = tx.objectStore(STORES.OUTBOX);
      if (!store) return;
      await store?.add?.(record);
      console.log(`[Outbox] Successfully enqueued record ${record.id}`);
    });
  } catch (error) {
    console.error(`[Outbox] Failed to enqueue record ${record.id}:`, error);
    throw error;
  }
}

/** Read up to N records (FIFO-ish using the raw store order). */
export async function readOutbox(topic: string, limit = 100): Promise<OutboxItem[]> {
  return await withTx('readonly', STORES.OUTBOX, async (tx) => {
    const store = tx.objectStore(STORES.OUTBOX);
    if (!store) return [];
    try {
      const all = await store.index('topic').getAll(topic);
      const sorted = (all as OutboxItem[]).sort((a, b) => b.at - a.at);
      return sorted.slice(0, limit);
    } catch (err) {
      // Fallback for older DBs missing the 'topic' index; remove once all clients are on v4+
      const all = (await store.getAll()) as OutboxItem[]
      const filtered = all.filter((r) => r.topic === topic)
      const sorted = filtered.sort((a, b) => b.at - a.at)
      return sorted.slice(0, limit)
    }
  });
}

/** Clear records by string key. */
export async function clearOutbox(ids: string[]) {
  if (ids.length === 0) return;
  await withTx('readwrite', STORES.OUTBOX, async (tx) => {
    const store = tx.objectStore(STORES.OUTBOX);
    if (!store) return;
    for (const id of ids) {
      await store?.delete?.(id);
    }
  });
}