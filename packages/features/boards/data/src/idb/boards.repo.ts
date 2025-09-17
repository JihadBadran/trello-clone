import { STORES, getAll, put, del } from '@tc/infra/idb';
import { enqueue } from '@tc/infra/idb';
import type { Board } from '@tc/boards/domain';
import { BoardsRepo } from '../ports';
import { OutboxItem, PushResult } from '@tc/infra/sync-cloud';

export const BoardsRepoIDB: BoardsRepo = {
  async getAll(): Promise<Board[]> {
    return await getAll<Board>(STORES.BOARDS);
  },
  async upsert(b: Board) {
    await put(STORES.BOARDS, b);
    await enqueue('boards', 'upsert', b);
  },
  async remove(id: string): Promise<void> {
    await del(STORES.BOARDS, id);
    await enqueue('boards', 'remove', { id });
  },
  async archive(id: string) {
    // optimistic: caller already flipped isArchived locally
    await enqueue('boards', 'upsert', { id, isArchived: true });
  },
  async applyFromCloud(row: Board): Promise<void> {
    // LWW: cloud wins
    // replace local with cloud
    await put(STORES.BOARDS, row);
  },
  async push(batch: OutboxItem<Board>[]): Promise<PushResult> {
    console.log('pushing boards', batch);
    return Promise.resolve({ ok: true, ackIds: batch.map((i) => i.id) });
  },
  async pullSince(since, limit) {
    console.log('pulling boards since', since, limit);
    return Promise.resolve({ ok: true, rows: [], cursor: new Date().toISOString() });
  },
};