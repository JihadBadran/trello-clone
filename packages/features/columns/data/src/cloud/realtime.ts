import { RealtimeChannel } from '@supabase/supabase-js'

export function subscribeColumns(board_id: string, realtimeChannel: RealtimeChannel, onChange: (payload: any) => void) {
  realtimeChannel.on('postgres_changes',
    { event: '*', schema: 'public', table: 'columns', filter: `board_id=eq.${board_id}` },
    onChange
  )
  return () => realtimeChannel.unsubscribe()
}