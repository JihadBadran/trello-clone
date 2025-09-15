import type { BoardsRepo } from '@tc/application-boards';
import type { Board } from '@tc/domain-boards';
import { supabase } from './client';

function rowToBoard(r: any): Board {
  return {
    id: r.id,
    title: r.title,
    ownerId: r.owner_id,
    isArchived: r.is_archived,
    updatedAt: r.updated_at
  } as Board;
}

export const BoardsRepoSupabase: BoardsRepo = {
  async getAll() {
    const { data, error } = await supabase.from('boards').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return data!.map(rowToBoard);
  },
  async since(ts) {
    const { data, error } = await supabase.from('boards').select('*').gt('updated_at', ts as unknown as string);
    if (error) throw error;
    return data!.map(rowToBoard);
  },
  async upsert(b) {
    const { error } = await supabase.from('boards').upsert({
      id: b.id, title: b.title, owner_id: b.ownerId, is_archived: b.isArchived, updated_at: b.updatedAt
    });
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await supabase.from('boards').delete().eq('id', id as any);
    if (error) throw error;
  }
};