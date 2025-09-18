import type { BoardsRepo } from '../ports';
import type { Board } from '@tc/boards/domain';
import { supabase } from '@tc/infra/supabase';
import { PushResult, PullResult, ISODateTime } from '@tc/infra/sync-cloud';
import { OutboxItem } from '@tc/foundation/types';

export const BoardsRepoSupabase: BoardsRepo = {
  async get(id: Board['id']) {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async getAll() {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data?.map((b) => ({ ...b, updatedAt: b.updated_at })) ?? [];
  },
  async upsert(b: Board) {
    const { error } = await supabase.from('boards').upsert({
      id: b.id,
      title: b.title,
      owner_id: b.owner_id,
      is_archived: b.is_archived,
      updated_at: b.updated_at,
    });
    if (error) throw error;
  },
  async archive(id: Board['id']) {
    const { error } = await supabase
      .from('boards')
      .update({ is_archived: true })
      .eq('id', id);
    if (error) throw error;
  },
  async remove(id: Board['id']) {
    const { error } = await supabase.from('boards').delete().eq('id', id);
    if (error) throw error;
  },
  async push(batch: OutboxItem<Board>[]): Promise<PushResult> {
    // Extract the payload from each OutboxItem. Dedupe is handled by the sync controller.
    const boards = batch.map((item) => item.payload);
    const { error } = await supabase
      .from('boards')
      .upsert(boards.map((b: Board) => ({ ...b, updated_at: b.updated_at })))
      .select();
    if (error) throw error;
    // Ack all original outbox items; controller may also ack duplicates it removed.
    return { ok: true, ackIds: batch.map((i) => i.id) };
  },
  async pullSince(since: ISODateTime | null, limit: number): Promise<PullResult<Board>> {
    let q = supabase
      .from('boards')
      .select('*')
      .order('updated_at', { ascending: true });

    if (since) {
      q = q.gt('updated_at', since);
    }
    if (limit && Number.isFinite(limit)) {
      q = q.limit(limit);
    }

    const { data, error } = await q;
    if (error) throw error;

    const rows = data ?? [];
    const newCursor = data && data.length ? data[data.length - 1].updated_at : since ?? undefined;

    return {
      ok: true,
      rows,
      cursor: newCursor,
    };
  },
  async applyFromCloud(row: Board): Promise<void> {
    await this.upsert(row);
  },
};
