import { supabase } from '@tc/infra/supabase';

type Handler = (payload: any) => void;

export function subscribeBoardRealtime(boardId: string, onChange: Handler) {
  const ch = supabase.channel(`boards:${boardId}`, {
    config: { broadcast: { self: false } },
  });
  ch.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'boards',
      filter: `id=eq.${boardId}`,
    },
    onChange
  );
  ch.subscribe();
  return () => supabase.removeChannel(ch);
}
