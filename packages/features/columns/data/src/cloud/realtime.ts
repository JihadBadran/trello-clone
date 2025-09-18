import { supabase } from '@tc/infra/supabase'

export function subscribeColumns(board_id: string, onChange: (payload: any) => void) {
  const ch = supabase.channel(`columns:${board_id}`, { config: { broadcast: { self: false } } })
  ch.on('postgres_changes',
    { event: '*', schema: 'public', table: 'columns', filter: `board_id=eq.${board_id}` },
    onChange
  )
  ch.subscribe()
  return () => supabase.removeChannel(ch)
}