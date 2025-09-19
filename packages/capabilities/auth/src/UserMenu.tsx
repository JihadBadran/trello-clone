import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@tc/uikit/components/ui/avatar';
import { Button } from '@tc/uikit/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tc/uikit/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';

import { supabase } from '@tc/infra/supabase';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { Profile } from '@tc/foundation/types';

const loadProfile = async (userId: string) => {
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return user;
};

const useUser = () => {
  const [profile, setProfile] = useState<Profile | null>();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    if (session?.user?.id) {
      loadProfile(session.user.id).then((profile) => {
        setProfile(profile);
      });
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { profile, session };
};

export const UserMenu = ({ onLogout }: { onLogout: () => void }) => {
  const { profile, session } = useUser();

  if (!session) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || ''} alt="@shadcn" />
            <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <span className="ml-2">{session?.user?.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuItem
          onClick={() => {
            supabase.auth.signOut();
            onLogout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
