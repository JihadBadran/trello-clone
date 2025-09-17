import type { BoardsRepo } from '../ports'
import type { Board } from '@tc/boards/domain'
import { supabase } from '@tc/infra/supabase'
import { OutboxItem, PushResult, PullResult, ISODateTime } from '@tc/infra/sync-cloud';

export const BoardsRepoSupabase: BoardsRepo = {
  async getAll() {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data?.map(b => ({...b, updatedAt: b.updated_at})) ?? []
  },
  async upsert(b: Board) {
    const { error } = await supabase.from('boards').upsert({
      id: b.id, title: b.title, owner_id: b.owner_id,
      is_archived: b.is_archived, updated_at: b.updated_at
    })
    if (error) throw error
  },
  async archive(id: Board['id']) {
    const { error } = await supabase.from('boards').update({ is_archived: true }).eq('id', id)
    if (error) throw error
  },
  async remove(id: Board['id']) {
    const { error } = await supabase.from('boards').delete().eq('id', id)
    if (error) throw error
  },
  async push(batch: OutboxItem<Board>[]): Promise<PushResult> {
    // Extract the payload from each OutboxItem
    const boards = batch.map(item => item.payload);
    const { error, data } = await supabase.from('boards').upsert(boards.map(b => ({...b, updated_at: b.updated_at}))).select();
    if (error) throw error;
    return { ok: true, ackIds: data?.map(i => i.id) };
  },
  async pullSince(since: ISODateTime | null): Promise<PullResult<Board>> {
    const { data, error } = await supabase.from('boards').select('*').gt('updated_at', since ?? '')
    if (error) throw error
    return { ok: true, rows: data?.map(b => ({...b, updatedAt: b.updated_at})) ?? [], cursor: since ?? undefined }
  },
  async applyFromCloud(row: Board): Promise<void> {
    await this.upsert(row);
  }
}