import type { Card } from '@tc/cards/domain';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function subscribeCardRealtime(
  board_id: string,
  realtimeChannel: RealtimeChannel,
  callback: (payload: RealtimePostgresChangesPayload<Card>) => void,
) {
  realtimeChannel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'cards',
      // filter: `board_id=eq.${board_id}`,
    },
    callback,
  );
  return () => realtimeChannel.unsubscribe();
}