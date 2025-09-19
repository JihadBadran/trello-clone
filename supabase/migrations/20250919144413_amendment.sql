-- Function runs as the owner (postgres) and is safe in policies
create or replace function public.is_board_member(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select exists (
    select 1
    from public.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id  = auth.uid()
  );
$func$;

-- Allow your client roles to call it
grant execute on function public.is_board_member(uuid) to authenticated, anon;