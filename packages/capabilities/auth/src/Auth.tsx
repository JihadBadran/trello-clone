import { Auth } from '@supabase/auth-ui-react';
import { supabase } from '@tc/infra/supabase';

import { ThemeSupa } from '@supabase/auth-ui-shared';

export const AuthPage = () => (
  <div className="min-w-lg">
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: ThemeSupa }}
      providers={[]}
      redirectTo="/"
      queryParams={{
        access_type: 'offline',
        prompt: 'consent',
      }}
    />
  </div>
);
