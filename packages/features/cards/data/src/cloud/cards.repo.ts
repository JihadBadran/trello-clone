import type { CardsRepo } from '@tc/cards/domain';
import type { Card } from '@tc/cards/domain';
import { supabase } from '@tc/infra/supabase';
import { PushResult, PullResult, ISODateTime } from '@tc/infra/sync-cloud';
import {OutboxItem} from "@tc/foundation/types";

export const CardsRepoSupabase: CardsRepo = {
  async get(id: Card['id']) {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async getAll(): Promise<PullResult<Card>> {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      return { ok: false, error };
    }
    const rows = data ?? [];
    return { ok: true, rows };
  },
  async upsert(c: Card) {
    const { error } = await supabase.from('cards').upsert(c);
    if (error) throw error;
  },
  async remove(id: Card['id']) {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) throw error;
  },
  async push(batch: OutboxItem<Card>[]): Promise<PushResult> {
    const cards = batch.map(item => item.payload);
    const { error } = await supabase
      .from('cards')
      .upsert(cards)
      .select();
    if (error) throw error;
    // IMPORTANT: ackIds must be the outbox item IDs, not entity IDs.
    return { ok: true, ackIds: batch.map(i => i.id) };
  },
  async pullSince(since: ISODateTime | null, limit: number): Promise<PullResult<Card>> {
    console.log('cards => pullSince', { since, limit });
    let q = supabase
      .from('cards')
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
    return { ok: true, rows, cursor: newCursor };
  },
  async applyFromCloud(row: Card): Promise<void> {
    await this.upsert(row);
  }
};
