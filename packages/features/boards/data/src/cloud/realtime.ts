import { supabase } from '@tc/infra/supabase';

type Handler = (payload: any) => void;

export function subscribeBoardsRealtime(onChange: Handler) {
  const ch = supabase.channel(`boards:all`, {
    config: { broadcast: { self: false } },
  });
  ch.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'boards',
    },
    onChange,
  );
  ch.subscribe();
  return () => ch.unsubscribe();
}

export function subscribeBoardRealtime(board_id: string, onChange: Handler) {
  const ch = supabase.channel(`boards:${board_id}`, {
    config: { broadcast: { self: false } },
  });
  ch.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'boards',
      filter: `id=eq.${board_id}`,
    },
    onChange
  );
  ch.subscribe();
  return () => supabase.removeChannel(ch);
}
