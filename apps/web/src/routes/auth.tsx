import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthPage } from '@tc/auth'
import { supabase } from '@tc/infra/supabase';

export const Route = createFileRoute('/auth')({
  component: () => <div className='flex justify-center items-center h-screen'><AuthPage /></div>,
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        throw redirect({ to: '/' }); // Redirect to home if already authenticated
    }
  }
})