import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { AuthPage as AuthPageComponent } from '@tc/auth';
import { supabase } from '@tc/infra/supabase';
import { useEffect } from 'react';

const AuthPage = () => {

  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate({ to: '/boards' }); // Redirect to home if already authenticated
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <AuthPageComponent />
    </div>
  );
};

export const Route = createFileRoute('/auth')({
  component: AuthPage,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      throw redirect({ to: '/' }); // Redirect to home if already authenticated
    }
  },
});
