import { supabase } from '@tc/infra/supabase';
import { Profile } from '@tc/foundation/types';
import { useEffect, useState } from 'react';

export const useBoardMembers = (boardId: string) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data: members } = await supabase
        .from('board_members')
        .select('user_id')
        .eq('board_id', boardId);

      if (members) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', members.map(m => m.user_id));
        setProfiles(profiles || []);
      }
    };

    if (boardId) {
      fetchMembers();
    }
  }, [boardId]);

  return profiles;
};
