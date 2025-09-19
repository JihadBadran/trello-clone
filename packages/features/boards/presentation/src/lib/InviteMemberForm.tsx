import { useForm, Controller } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@tc/infra/supabase';
import { Button } from '@tc/uikit/components/ui/button';
import { Input } from '@tc/uikit/components/ui/input';
import { Label } from '@tc/uikit/components/ui/label';
import { inviteMemberSchema, InviteMemberFormInput, validateEmail, validateUuid } from '@tc/foundation/validation';
import { Avatar, AvatarFallback, AvatarImage } from '@tc/uikit/components/ui/avatar';

export type InviteMemberFormProps = {
  boardId: string;
};

export function InviteMemberForm({ boardId }: InviteMemberFormProps) {
  const { control, handleSubmit, setError, setValue, watch, formState: { errors, isSubmitting, isSubmitSuccessful, isSubmitted } } = useForm<InviteMemberFormInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      identifier: '',
      role: 'editor',
    },
  });

  type ProfileRow = { id: string; email: string | null; full_name: string | null; avatar_url: string | null };
  const [results, setResults] = useState<ProfileRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const query = watch('identifier');

  useEffect(() => {
    // check if email is valid with zod
    const usingEmail = validateEmail.safeParse(query).success;
    // check if uuid is valid with zod
    const isUuid = validateUuid.safeParse(query).success;

    if (!usingEmail && !isUuid) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        let q = supabase
          .from('profiles')
          .select('*')
          .limit(10);

        if (usingEmail) {
          q = q.eq('email', query);
        } else if (isUuid) {
          q = q.eq('id', query);
        }

        const { data, error } = await q;
        if (!cancelled) {
          if (!error) setResults((data ?? []) as ProfileRow[]);
          setIsSearching(false);
        }
      } catch {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  async function onSubmit(values: InviteMemberFormInput) {
    try {
      let userId = values.identifier;
      if (userId.includes('@')) {
        const { data, error } = await (supabase as any)
          .from('profiles')
          .select('id')
          .eq('email', userId)
          .single();
        if (error || !data) {
          setError('identifier', { type: 'manual', message: 'User with this email not found.' });
          return;
        }
        userId = data.id;
      }

      const { error: inviteError } = await supabase
        .from('board_members')
        .upsert({ board_id: boardId, user_id: userId, role: values.role || 'editor' }, { onConflict: 'board_id,user_id' });

      if (inviteError) throw inviteError;

    } catch (err: any) {
      setError('root.serverError', { type: 'manual', message: err.message || 'Failed to invite member' });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="identifier">Search user (email or ID)</Label>
        <Controller
          name="identifier"
          control={control}
          render={({ field }) => (
            <Input
              id="identifier"
              placeholder="user@example.com or UUID"
              autoComplete="off"
              {...field}
            />
          )}
        />
        {isSearching && (
          <p className="text-xs text-muted-foreground">Searching…</p>
        )}
        {results.length > 0 && (
          <div className="mt-2 max-h-48 overflow-auto rounded-md border bg-background">
            {results.map((r) => (
              <button
                type="button"
                key={r.id}
                className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-accent"
                onClick={() => {
                  setValue('identifier', r.id, { shouldValidate: true });
                  setResults([]);
                }}
              >
                <Avatar>
                  <AvatarImage src={r.avatar_url || undefined} />
                  <AvatarFallback>{r.full_name?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{r.email ?? r.full_name ?? r.id}</div>
                  <div className="text-xs text-muted-foreground">{r.id}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {errors.identifier && <p className="text-sm text-destructive">{errors.identifier.message}</p>}
        <p className="text-xs text-muted-foreground">Select a user from the list or paste their email/ID.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label>Role</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <div className="flex gap-2">
              <Button type="button" variant={field.value === 'editor' ? 'default' : 'outline'} onClick={() => field.onChange('editor')}>Editor</Button>
              <Button type="button" variant={field.value === 'owner' ? 'default' : 'outline'} onClick={() => field.onChange('owner')}>Owner</Button>
            </div>
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Inviting…' : 'Invite'}
        </Button>
        {errors.root?.serverError && <span className="text-sm text-destructive">{errors.root.serverError.message}</span>}
        {isSubmitSuccessful && isSubmitted && <span className="text-sm text-green-600">Member invited successfully!</span>}
      </div>
    </form>
  );
}
