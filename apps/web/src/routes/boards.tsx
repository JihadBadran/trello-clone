import { createFileRoute, redirect } from '@tanstack/react-router';
import { BoardsFeature } from '@tc/boards/presentation';
import { supabase } from '@tc/infra/supabase';

export const Route = createFileRoute('/boards')({
  async beforeLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw redirect({ to: '/auth' }); // Redirect to login if not authenticated
    }
  },
  component: BoardsFeature,
});
