import { supabase } from '@tc/infra/supabase';
import type { Card } from '@tc/cards/domain';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function subscribeCardRealtime(
  board_id: string,
  callback: (payload: RealtimePostgresChangesPayload<Card>) => void,
) {
  const ch = supabase.channel(`cards:${board_id}`, {
    config: { broadcast: { self: false, ack: true }, presence: { enabled: true } },
  });
  ch.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'cards',
      filter: `board_id=eq.${board_id}`,
    },
    callback,
  );
  ch.subscribe();
  return () => supabase.removeChannel(ch);
}