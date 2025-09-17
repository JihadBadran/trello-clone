import type { IDBPDatabase, IDBPTransaction } from 'idb';
import type { TrelloCloneDB } from './schema.types';

/**
 * Central place for DB name, version, and stores.
 * Keep this feature-agnostic; boards/columns/cards are generic stores,
 * but infra does not know domain types.
 */
export const DB_NAME = 'tc'
export const DB_VERSION = 3 as const

// Store names
export const STORES = {
  BOARDS: 'boards',
  COLUMNS: 'columns',
  CARDS: 'cards',
  OUTBOX: 'outbox',
  META: 'meta',
} as const
export type StoreName = typeof STORES[keyof typeof STORES]

/**
 * Upgrade function for idb.openDB(..., { upgrade })
 * Add new version branches as you evolve schema.
 */
export function upgrade(
  db: IDBPDatabase<TrelloCloneDB>,
  oldVersion: number,
  newVersion: number | null,
  tx: IDBPTransaction<TrelloCloneDB, StoreName[], 'versionchange'>,
) {
  // v1: boards, outbox
  if (oldVersion < 1) {
    if (!db.objectStoreNames.contains(STORES.BOARDS)) {
      const s = tx.db.createObjectStore(STORES.BOARDS, { keyPath: 'id' });
      s.createIndex('by_updatedAt', 'updatedAt');
    }
    if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
      tx.db.createObjectStore(STORES.OUTBOX, { keyPath: 'id' });
    }
  }

  // v2: meta (key-value)
  if (oldVersion < 2) {
    if (!db.objectStoreNames.contains(STORES.META)) {
      tx.db.createObjectStore(STORES.META); // key-value store
    }
  }

  // v3: columns & cards
  if (oldVersion < 3) {
    if (!db.objectStoreNames.contains(STORES.COLUMNS)) {
      const s = tx.db.createObjectStore(STORES.COLUMNS, { keyPath: 'id' });
      s.createIndex('by_boardId', 'boardId');
      s.createIndex('by_updatedAt', 'updatedAt');
    }
    if (!db.objectStoreNames.contains(STORES.CARDS)) {
      const s = tx.db.createObjectStore(STORES.CARDS, { keyPath: 'id' });
      s.createIndex('by_boardId', 'boardId');
      s.createIndex('by_columnId', 'columnId');
      s.createIndex('by_updatedAt', 'updatedAt');
    }
  }
}