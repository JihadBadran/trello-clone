import type { ColumnsRepo } from '@tc/columns/application';
import type { Column } from '@tc/columns/application';
import { supabase } from '@tc/infra/supabase';
import { OutboxItem, PushResult, PullResult, ISODateTime } from '@tc/infra/sync-cloud';

export const ColumnsRepoSupabase: ColumnsRepo = {
  async getAll() {
    const { data, error } = await supabase
      .from('columns')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data?.map(c => ({...c, boardId: c.board_id, createdAt: c.created_at, updatedAt: c.updated_at, deletedAt: c.deleted_at})) ?? [];
  },
  async upsert(c: Column) {
    const { error } = await supabase.from('columns').upsert({
      id: c.id, title: c.title, board_id: c.boardId,
      position: c.position, updated_at: c.updatedAt
    });
    if (error) throw error;
  },
  async remove(id: Column['id']) {
    const { error } = await supabase.from('columns').delete().eq('id', id as any);
    if (error) throw error;
  },
  async push(batch: OutboxItem<Column>[]): Promise<PushResult> {
    const columns = batch.map(item => item.payload);
    const { error, data } = await supabase.from('columns').upsert(columns.map(c => ({...c, board_id: c.boardId, created_at: c.createdAt, updated_at: c.updatedAt, deleted_at: c.deletedAt}))).select();
    if (error) throw error;
    return { ok: true, ackIds: data?.map(i => i.id) };
  },
  async pullSince(since: ISODateTime | null): Promise<PullResult<Column>> {
    const { data, error } = await supabase.from('columns').select('*').gt('updated_at', since ?? '');
    if (error) throw error;
    return { ok: true, rows: data?.map(c => ({...c, boardId: c.board_id, createdAt: c.created_at, updatedAt: c.updated_at, deletedAt: c.deleted_at})) ?? [], cursor: since ?? undefined };
  },
  async applyFromCloud(row: Column): Promise<void> {
    await this.upsert(row);
  }
};
