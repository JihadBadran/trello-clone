import { RealtimeChannel } from '@supabase/supabase-js';

type Handler = (payload: any) => void;

export function subscribeBoardsRealtime(realtimeChannel: RealtimeChannel, onChange: Handler) {
  realtimeChannel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'boards',
    },
    onChange,
  );
  return () => realtimeChannel.unsubscribe();
}

export function subscribeBoardRealtime(board_id: string, realtimeChannel: RealtimeChannel, onChange: Handler) {
  realtimeChannel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'boards',
      filter: `id=eq.${board_id}`,
    },
    onChange
  );
  realtimeChannel.subscribe();
  return () => realtimeChannel.unsubscribe();
}
