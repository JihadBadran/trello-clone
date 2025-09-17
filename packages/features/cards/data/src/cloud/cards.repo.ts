import type { CardsRepo } from '@tc/cards/domain';
import type { Card } from '@tc/cards/domain';
import { supabase } from '@tc/infra/supabase';
import { OutboxItem, PushResult, PullResult, ISODateTime } from '@tc/infra/sync-cloud';

export const CardsRepoSupabase: CardsRepo = {
  async getAll() {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data?.map(c => ({...c, boardId: c.board_id, columnId: c.column_id, assigneeId: c.assignee_id, dueDate: c.due_date, createdAt: c.created_at, updatedAt: c.updated_at, deletedAt: c.deleted_at})) ?? [];
  },
  async upsert(c: Card) {
    const { error } = await supabase.from('cards').upsert({
      id: c.id, title: c.title, board_id: c.board_id, column_id: c.column_id,
      description: c.description, position: c.position, assignee_id: c.assignee_id,
      due_date: c.due_date, updated_at: c.updated_at
    });
    if (error) throw error;
  },
  async remove(id: Card['id']) {
    const { error } = await supabase.from('cards').delete().eq('id', id as any);
    if (error) throw error;
  },
  async push(batch: OutboxItem<Card>[]): Promise<PushResult> {
    const cards = batch.map(item => item.payload);
    const { error, data } = await supabase.from('cards').upsert(cards.map(c => ({...c, board_id: c.board_id, column_id: c.column_id, assignee_id: c.assignee_id, due_date: c.due_date, created_at: c.created_at, updated_at: c.updated_at, deleted_at: c.deleted_at}))).select();
    if (error) throw error;
    return { ok: true, ackIds: data?.map(i => i.id) };
  },
  async pullSince(since: ISODateTime | null): Promise<PullResult<Card>> {
    const { data, error } = await supabase.from('cards').select('*').gt('updated_at', since ?? '');
    if (error) throw error;
    return { ok: true, rows: data?.map(c => ({...c, boardId: c.board_id, columnId: c.column_id, assigneeId: c.assignee_id, dueDate: c.due_date, createdAt: c.created_at, updatedAt: c.updated_at, deletedAt: c.deleted_at})) ?? [], cursor: since ?? undefined };
  },
  async applyFromCloud(row: Card): Promise<void> {
    await this.upsert(row);
  }
};
