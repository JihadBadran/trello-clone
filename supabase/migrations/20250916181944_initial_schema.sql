-- Enable UUID generator (gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) DOMAIN TABLES
create table if not exists public.boards (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.board_members (
  board_id   uuid not null references public.boards(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner','editor')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table if not exists public.columns (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  title      text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_columns_board on public.columns(board_id);
create index if not exists idx_columns_updated_at on public.columns(updated_at);

create table if not exists public.cards (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  column_id  uuid not null references public.columns(id) on delete cascade,
  title      text not null,
  description text,
  position   integer not null default 0,
  due_date   timestamptz,
  assignee_id uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_cards_board on public.cards(board_id);
create index if not exists idx_cards_column on public.cards(column_id);
create index if not exists idx_cards_updated_at on public.cards(updated_at);

-- 2) UPDATED_AT TRIGGER
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

do $$
begin
  if to_regclass('public.tg_boards_updated_at') is null then
    create trigger tg_boards_updated_at before update on public.boards
      for each row execute function public.set_updated_at();
  end if;
  if to_regclass('public.tg_columns_updated_at') is null then
    create trigger tg_columns_updated_at before update on public.columns
      for each row execute function public.set_updated_at();
  end if;
  if to_regclass('public.tg_cards_updated_at') is null then
    create trigger tg_cards_updated_at before update on public.cards
      for each row execute function public.set_updated_at();
  end if;
end$$;

-- 3) AUTO-MEMBERSHIP TRIGGER (owner becomes member)
create or replace function public.add_owner_membership()
returns trigger language plpgsql security definer as $$
begin
  insert into public.board_members(board_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end $$;

do $$
begin
  if to_regclass('public.tg_boards_owner_membership') is null then
    create trigger tg_boards_owner_membership after insert on public.boards
      for each row execute function public.add_owner_membership();
  end if;
end$$;

-- 4) RLS
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.columns enable row level security;
alter table public.cards enable row level security;

-- Helpers: membership checks
create or replace function public.is_board_member(p_board_id uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.board_members bm
    where bm.board_id = p_board_id and bm.user_id = auth.uid()
  );
$$;

create or replace function public.is_board_owner(p_board_id uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.board_members bm
    where bm.board_id = p_board_id and bm.user_id = auth.uid() and bm.role = 'owner'
  );
$$;

-- boards policies
create policy "boards: select if member"
on public.boards for select
using (public.is_board_member(id));

create policy "boards: insert if owner self"
on public.boards for insert
with check (owner_id = auth.uid());

create policy "boards: update if owner or editor"
on public.boards for update
using (public.is_board_member(id))
with check (
  exists(select 1 from public.board_members m
         where m.board_id = id and m.user_id = auth.uid() and m.role in ('owner','editor'))
);

create policy "boards: delete if owner"
on public.boards for delete
using (public.is_board_owner(id));

-- board_members policies
create policy "members: select if member"
on public.board_members for select
using (public.is_board_member(board_id));

create policy "members: insert by board owner"
on public.board_members for insert
with check (public.is_board_owner(board_id));

create policy "members: update by board owner"
on public.board_members for update
using (public.is_board_owner(board_id))
with check (public.is_board_owner(board_id));

create policy "members: delete by board owner"
on public.board_members for delete
using (public.is_board_owner(board_id));

-- columns policies (member of parent board)
create policy "columns: select if member"
on public.columns for select
using (public.is_board_member(board_id));

create policy "columns: insert if member"
on public.columns for insert
with check (public.is_board_member(board_id));

create policy "columns: update if member"
on public.columns for update
using (public.is_board_member(board_id))
with check (public.is_board_member(board_id));

create policy "columns: delete if member"
on public.columns for delete
using (public.is_board_member(board_id));

-- cards policies (member of parent board)
create policy "cards: select if member"
on public.cards for select
using (public.is_board_member(board_id));

create policy "cards: insert if member"
on public.cards for insert
with check (public.is_board_member(board_id));

create policy "cards: update if member"
on public.cards for update
using (public.is_board_member(board_id))
with check (public.is_board_member(board_id));

create policy "cards: delete if member"
on public.cards for delete
using (public.is_board_member(board_id));