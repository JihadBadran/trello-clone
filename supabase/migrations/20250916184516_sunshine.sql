-- 0) prereqs
create extension if not exists pgcrypto;

-- 1) new columns for soft delete + archive index
alter table public.columns add column if not exists deleted_at timestamptz;
alter table public.cards   add column if not exists deleted_at timestamptz;
create index if not exists idx_columns_deleted_at on public.columns(deleted_at);
create index if not exists idx_cards_deleted_at   on public.cards(deleted_at);
create index if not exists idx_boards_is_archived on public.boards(is_archived);

-- 2) ensure updated_at triggers exist (from earlier migration)
-- (kept as-is; they already bump updated_at on any UPDATE, including soft delete)

-- 3) RLS: refine SELECT to exclude soft-deleted rows
drop policy if exists "columns: select if member" on public.columns;
create policy "columns: select if member"
on public.columns for select
using (public.is_board_member(board_id) and deleted_at is null);

drop policy if exists "cards: select if member" on public.cards;
create policy "cards: select if member"
on public.cards for select
using (public.is_board_member(board_id) and deleted_at is null);

-- 4) RLS: allow insert/update if member (unchanged);
-- but disallow hard delete via DELETE; only soft-delete via UPDATE setting deleted_at
drop policy if exists "columns: delete if member" on public.columns;
create policy "columns: delete disabled (use soft delete)" on public.columns for delete
to authenticated using (false);

drop policy if exists "cards: delete if member" on public.cards;
create policy "cards: delete disabled (use soft delete)" on public.cards for delete
to authenticated using (false);

-- Keep existing INSERT/UPDATE policies; add WITH CHECK to prevent un-deleting unless member
drop policy if exists "columns: update if member" on public.columns;
create policy "columns: update if member"
on public.columns for update
using (public.is_board_member(board_id))
with check (public.is_board_member(board_id));

drop policy if exists "cards: update if member" on public.cards;
create policy "cards: update if member"
on public.cards for update
using (public.is_board_member(board_id))
with check (public.is_board_member(board_id));

-- 5) Boards realtime & archive behavior
-- We already have is_archived boolean on boards.
-- Keep existing boards policies; SELECT should include archived boards for members.
-- (If you want to hide archived boards from normal lists, do it in the client query.)

-- 6) Enable realtime for these tables (replication publication)
-- Supabase uses the "supabase_realtime" publication.
alter publication supabase_realtime add table public.boards;
alter publication supabase_realtime add table public.columns;
alter publication supabase_realtime add table public.cards;