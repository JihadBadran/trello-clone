import { openDB, type IDBPDatabase } from 'idb';
import type { BoardsRepo } from '@tc/application-boards';
import type { Board } from '@tc/domain-boards';

const DB_NAME = 'trello-clone';
const STORE_BOARDS = 'boards';

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_BOARDS)) db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
      }
    });
  }
  return dbPromise;
}

export const BoardsRepoIDB: BoardsRepo = {
  async getAll() {
    const d = await db();
    return await d.getAll(STORE_BOARDS) as Board[];
  },
  async since(_ts) {
    const d = await db();
    return await d.getAll(STORE_BOARDS) as Board[];
  },
  async upsert(b) {
    const d = await db();
    await d.put(STORE_BOARDS, b);
  },
  async remove(id) {
    const d = await db();
    await d.delete(STORE_BOARDS, id as any);
  }
};