import { supabase } from '@tc/infra/supabase';
import type { Card } from '@tc/cards/domain';

export function subscribeCardRealtime(board_id: string, callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Card }) => void) {
  const ch = supabase.channel(`cards:${board_id}`, { config: { broadcast: { self: false } } })
    ch.on('postgres_changes' as any,
    { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${board_id}` },
    callback
  )
  ch.subscribe()
  return () => supabase.removeChannel(ch)
}