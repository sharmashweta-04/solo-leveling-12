-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- One snapshot row per player, protected by Row Level Security so a user can only touch their own data.

create table if not exists public.player_snapshots (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb       not null,
  revision   integer     not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.player_snapshots enable row level security;

create policy "read own snapshot"   on public.player_snapshots for select using (auth.uid() = user_id);
create policy "insert own snapshot" on public.player_snapshots for insert with check (auth.uid() = user_id);
create policy "update own snapshot" on public.player_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own snapshot" on public.player_snapshots for delete using (auth.uid() = user_id);

-- Safety net: keep older versions so a bad sync or bad import can be rolled back.
create table if not exists public.player_snapshot_history (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  data     jsonb not null,
  revision integer not null,
  saved_at timestamptz not null default now()
);

alter table public.player_snapshot_history enable row level security;
create policy "read own history" on public.player_snapshot_history for select using (auth.uid() = user_id);

create or replace function public.keep_snapshot_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- at most one history copy per 12 hours, keep the newest 20 per user
  if not exists (
    select 1 from public.player_snapshot_history h
    where h.user_id = old.user_id and h.saved_at > now() - interval '12 hours'
  ) then
    insert into public.player_snapshot_history (user_id, data, revision)
    values (old.user_id, old.data, old.revision);

    delete from public.player_snapshot_history
    where user_id = old.user_id
      and id not in (
        select id from public.player_snapshot_history
        where user_id = old.user_id
        order by saved_at desc
        limit 20
      );
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_keep_snapshot_history on public.player_snapshots;
create trigger trg_keep_snapshot_history
before update on public.player_snapshots
for each row execute function public.keep_snapshot_history();
