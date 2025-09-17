import { supabase } from '@tc/infra/supabase';
import type { Card } from '@tc/cards/application';

export function subscribeCardRealtime(boardId: string, callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Card }) => void) {
  const ch = supabase.channel(`cards:${boardId}`, { config: { broadcast: { self: false } } })
  ch.on('postgres_changes',
    { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` },
    callback
  )
  ch.subscribe()
  return () => supabase.removeChannel(ch)
}