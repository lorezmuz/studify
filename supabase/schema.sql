-- Volentieri - schema Supabase
-- Esegui questo SQL nel SQL Editor del progetto Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  xp integer not null default 0,
  streak integer not null default 0,
  last_study_date date,
  sessions_completed integer not null default 0,
  correct_answers integer not null default 0,
  total_answers integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id text not null,
  pack jsonb not null,
  completed_modes text[] not null default '{}',
  quiz_score integer,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pack_id)
);

create index if not exists learning_sessions_user_id_idx
  on public.learning_sessions (user_id, updated_at desc);

-- If you already ran an older schema, add pack_id safely:
-- alter table public.learning_sessions add column if not exists pack_id text;
-- update public.learning_sessions set pack_id = pack->>'id' where pack_id is null;
-- alter table public.learning_sessions alter column pack_id set not null;
-- create unique index if not exists learning_sessions_user_pack_uidx on public.learning_sessions (user_id, pack_id);

alter table public.profiles enable row level security;
alter table public.learning_sessions enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Profiles are insertable by owner" on public.profiles;
drop policy if exists "Profiles are updatable by owner" on public.profiles;
drop policy if exists "Sessions are viewable by owner" on public.learning_sessions;
drop policy if exists "Sessions are insertable by owner" on public.learning_sessions;
drop policy if exists "Sessions are updatable by owner" on public.learning_sessions;
drop policy if exists "Sessions are deletable by owner" on public.learning_sessions;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "Profiles are insertable by owner"
  on public.profiles for insert
  to authenticated
  with check ( (select auth.uid()) = id );

create policy "Profiles are updatable by owner"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

create policy "Sessions are viewable by owner"
  on public.learning_sessions for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Sessions are insertable by owner"
  on public.learning_sessions for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Sessions are updatable by owner"
  on public.learning_sessions for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Sessions are deletable by owner"
  on public.learning_sessions for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Optional: expose tables to Data API roles (if your project requires explicit grants)
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.learning_sessions to authenticated;
