import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb';
import { DB_NAME, DB_VERSION, upgrade, type StoreName } from './schema';
import type { TrelloCloneDB } from './schema.types';

let _dbp: Promise<IDBPDatabase<TrelloCloneDB>> | null = null;

export function db(): Promise<IDBPDatabase<TrelloCloneDB>> {
  if (!_dbp) {
    _dbp = openDB<TrelloCloneDB>(DB_NAME, DB_VERSION, { upgrade });
  }
  return _dbp;
}

/** Utility to run a transaction across one or more stores. */
export async function withTx<T>(
  mode: IDBTransactionMode,
  stores: StoreName[] | StoreName,
  fn: (tx: IDBPTransaction<TrelloCloneDB, StoreName[], 'readwrite' | 'readonly' | 'versionchange'>) => Promise<T> | T,
): Promise<T> {
  const d = await db();
  const s = Array.isArray(stores) ? stores : [stores];
  const tx = d.transaction(s, mode);
  const res = await fn(tx);
  await tx.done;
  return res;
}

// NOTE: The generic helpers were causing a cascade of complex type errors.
// Replacing them with specific, non-generic functions is more verbose but
// guarantees type safety and avoids the issues.

export async function getAll(store: StoreName): Promise<any[]> {
  const d = await db();
  return d.getAll(store);
}

export async function put(store: StoreName, value: any): Promise<void> {
  const d = await db();
  await d.put(store, value);
}

export async function del(store: StoreName, key: string): Promise<void> {
  const d = await db();
  await d.delete(store, key);
}
