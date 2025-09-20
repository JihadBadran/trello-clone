import { STORES, getAll, put, del, get as idbGet } from '@tc/infra/idb';
import { enqueue } from '@tc/infra/idb';
import type { Board } from '@tc/boards/domain';
import { FeatureRepo, ISODateTime, OutboxItem, PullResult, PushResult } from '@tc/foundation/types';

export class BoardsRepoIDB implements FeatureRepo<Board> {
  public onApply?: (item: Board) => void;

  constructor(onApply?: (item: Board) => void) {
    this.onApply = onApply;
  }


  async get(id: string): Promise<Board | null> {
    const row = await idbGet(STORES.BOARDS, id);
    return row ? (row as Board) : null;
  }

  async getAll(): Promise<PullResult<Board>> {
    const rows = await getAll(STORES.BOARDS);
    return { ok: true, rows };
  }

  async putLocal(b: Board) {
    await put(STORES.BOARDS, b);
  }
  async enqueueUpsert(b: Board) {
    await enqueue('boards', 'upsert', b);
  }
  async upsert(b: Board) {
    await this.putLocal(b);
    await this.enqueueUpsert(b);
  }

  async removeLocal(id: string): Promise<void> {
    await del(STORES.BOARDS, id);
  }
  async enqueueRemove(id: string): Promise<void> {
    await enqueue('boards', 'remove', { id });
  }
  async remove(id: string): Promise<void> {
    await this.removeLocal(id);
    await this.enqueueRemove(id);
  }

  async archive(id: string) {
    // optimistic: caller already flipped isArchived locally
    await enqueue('boards', 'upsert', { id, is_archived: true, updated_at: new Date().toISOString() });
  }

  async applyFromCloud(row: Board): Promise<void> {
    // LWW: cloud wins
    // replace local with cloud
    await put(STORES.BOARDS, row);
    this.onApply?.(row);
  }

  async push(batch: OutboxItem<Board>[]): Promise<PushResult> {
    console.log('pushing boards', batch);
    return Promise.resolve({ ok: true, ackIds: batch.map((i) => i.id) });
  }

  async pullSince(since: string | null, limit: number) {
    console.log('pulling boards since', since, limit);
    return Promise.resolve({ ok: true, rows: [], cursor: new Date().toISOString() as ISODateTime });
  }
};

export const boardsRepoIDB = new BoardsRepoIDB();