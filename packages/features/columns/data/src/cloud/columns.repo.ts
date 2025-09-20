import { supabase } from '@tc/infra/supabase';
import { PushResult, PullResult, ISODateTime } from '@tc/foundation/types';
import { Column } from '@tc/columns/domain';
import { OutboxItem } from "@tc/foundation/types";

export const ColumnsRepoSupabase = {
  async get(id: Column['id']) {
    const { data, error } = await supabase
      .from('columns')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async getAll(): Promise<PullResult<Column>> {
    const { data, error } = await supabase
      .from('columns')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      return { ok: false, error };
    }
    const rows = data ?? [];
    return { ok: true, rows };
  },
  async upsert(c: Column) {
    const { error } = await supabase.from('columns').upsert({
      id: c.id, title: c.title, board_id: c.board_id,
      position: c.position, updated_at: c.updated_at
    });
    if (error) throw error;
  },
  async remove(id: Column['id']) {
    const { error } = await supabase.from('columns').delete().eq('id', id);
    if (error) throw error;
  },
  async push(batch: OutboxItem<Column>[]): Promise<PushResult> {
    const columns = batch.map(item => item.payload);
    const { error } = await supabase
      .from('columns')
      .upsert(columns.map(c => ({
        ...c,
        board_id: c.board_id,
        created_at: c.created_at,
        updated_at: c.updated_at,
        deleted_at: c.deleted_at,
      })))
      .select();
    if (error) throw error;
    // IMPORTANT: ackIds must be the outbox item IDs, not entity IDs.
    return { ok: true, ackIds: batch.map(i => i.id) };
  },
  async pullSince(since: ISODateTime | null, limit: number): Promise<PullResult<Column>> {
    console.log('columns => pullSince', { since, limit });
    let q = supabase
      .from('columns')
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
    return { ok: true, rows, cursor: newCursor as ISODateTime };
  },
  async applyFromCloud(row: Column): Promise<void> {
    await this.upsert(row);
  }
};
