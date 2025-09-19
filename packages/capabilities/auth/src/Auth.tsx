import { Auth } from '@supabase/auth-ui-react'
import { supabase } from '@tc/infra/supabase'

import {
  ThemeSupa
} from '@supabase/auth-ui-shared';
import { Card, CardContent, CardHeader, CardTitle } from '@tc/uikit/ui/card';

export const AuthPage = () => (
  <Card className='min-w-lg'>
    <CardHeader>
      <CardTitle>Sign In</CardTitle>
    </CardHeader>
    <CardContent>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={[]}
        redirectTo='/'
        queryParams={{
          access_type: 'offline',
          prompt: 'consent',
        }}
      />
    </CardContent>
  </Card>
)