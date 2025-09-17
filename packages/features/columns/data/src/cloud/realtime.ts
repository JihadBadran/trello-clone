import { supabase } from '@tc/infra/supabase'

export function subscribeColumns(boardId: string, onChange: (payload: any) => void) {
  const ch = supabase.channel(`columns:${boardId}`, { config: { broadcast: { self: false } } })
  ch.on('postgres_changes',
    { event: '*', schema: 'public', table: 'columns', filter: `board_id=eq.${boardId}` },
    onChange
  )
  ch.subscribe()
  return () => supabase.removeChannel(ch)
}