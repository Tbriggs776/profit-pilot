-- Profit Pilot: initial schema
-- Run via Supabase SQL editor or `supabase db push`

-- =========================================================
-- profiles: extends auth.users with app-level fields
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- analytics_events
-- =========================================================
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  page text,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  properties jsonb default '{}'::jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists analytics_events_timestamp_idx
  on public.analytics_events (timestamp desc);
create index if not exists analytics_events_event_name_idx
  on public.analytics_events (event_name);
create index if not exists analytics_events_user_id_idx
  on public.analytics_events (user_id);

alter table public.analytics_events enable row level security;

-- Anyone (anon or authenticated) can insert their own analytics events
drop policy if exists "analytics_events_insert_anyone" on public.analytics_events;
create policy "analytics_events_insert_anyone" on public.analytics_events
  for insert with check (
    user_id is null or user_id = auth.uid()
  );

-- Only admins can read
drop policy if exists "analytics_events_select_admin" on public.analytics_events;
create policy "analytics_events_select_admin" on public.analytics_events
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
