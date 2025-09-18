import type { IDBPDatabase, IDBPTransaction } from 'idb';
import type { TrelloCloneDB } from './schema.types';

/**
 * Central place for DB name, version, and stores.
 * Keep this feature-agnostic; boards/columns/cards are generic stores,
 * but infra does not know domain types.
 */
export const DB_NAME = 'tc'
export const DB_VERSION = 4 as const

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
      const s = tx.db.createObjectStore(STORES.OUTBOX, { keyPath: 'id' });
      // Ensure we can query outbox items by topic efficiently
      s.createIndex('topic', 'topic');
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
      s.createIndex('by_board_id', 'board_id');
      s.createIndex('by_updatedAt', 'updatedAt');
    }
    if (!db.objectStoreNames.contains(STORES.CARDS)) {
      const s = tx.db.createObjectStore(STORES.CARDS, { keyPath: 'id' });
      s.createIndex('by_board_id', 'board_id');
      s.createIndex('by_column_id', 'column_id');
      s.createIndex('by_updatedAt', 'updatedAt');
    }
  }

  // v4: add missing index on outbox(topic) for readOutbox()
  if (oldVersion < 4) {
    const s = tx.objectStore(STORES.OUTBOX)
    if (!s.indexNames.contains('topic')) {
      s.createIndex('topic', 'topic')
    }
  }
}