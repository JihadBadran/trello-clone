import { withTx } from './client';
import { STORES } from './schema'

export async function metaGet<T = unknown>(key: string): Promise<T | null> {
  return await withTx('readonly', STORES.META, async (tx) => {
    const store = tx.objectStore(STORES.META);
    const v = await store.get(key);
    return (v ?? null) as T | null;
  });
}
export async function metaSet<T = unknown>(key: string, value: T): Promise<void> {
  await withTx('readwrite', STORES.META, async (tx) => {
    const store = tx.objectStore(STORES.META);
    if (!store) throw new Error('Meta store not found');
    await store?.put?.(value, key);
  });
}

const CURSOR_PREFIX = 'cursor:'

export async function getCursor(topic: string): Promise<string | null> {
  return await metaGet<string>(`${CURSOR_PREFIX}${topic}`)
}
export async function setCursor(topic: string, iso: string): Promise<void> {
  await metaSet(`${CURSOR_PREFIX}${topic}`, iso)
}