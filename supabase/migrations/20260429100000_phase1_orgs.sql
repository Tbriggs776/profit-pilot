-- Phase 1: organizations, team membership, branding, profile defaults

-- =========================================================
-- contractor_type enum
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'contractor_type') then
    create type public.contractor_type as enum (
      'general', 'hvac', 'plumbing', 'electrical', 'roofing',
      'concrete', 'flooring', 'painting', 'landscaping',
      'carpentry', 'drywall', 'cleaning', 'other'
    );
  end if;
end $$;

-- =========================================================
-- organizations: the contractor business
-- =========================================================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contractor_type public.contractor_type not null default 'general',
  logo_url text,
  phone text,
  address text,
  license_number text,
  website text,
  default_tax_rate numeric(5,2) not null default 8.25,
  default_margin numeric(5,2) not null default 25.00,
  default_commission numeric(5,2) not null default 0.00,
  default_warranty numeric(5,2) not null default 0.00,
  default_finance_rate numeric(5,2) not null default 0.00,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_created_by_idx
  on public.organizations (created_by);

-- =========================================================
-- org_members: links auth.users to organizations w/ a role
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type public.org_role as enum ('owner', 'admin', 'member');
  end if;
end $$;

create table if not exists public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists org_members_user_idx on public.org_members (user_id);
create index if not exists org_members_org_idx on public.org_members (org_id);

-- =========================================================
-- profiles: add active_org_id
-- =========================================================
alter table public.profiles
  add column if not exists active_org_id uuid references public.organizations(id) on delete set null;

-- =========================================================
-- Helper: is the current user a member of org?
-- (SECURITY DEFINER avoids RLS recursion when policies cross-reference org_members.)
-- =========================================================
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = target_org and user_id = auth.uid()
  );
$$;

create or replace function public.org_role_for(target_org uuid)
returns public.org_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.org_members
  where org_id = target_org and user_id = auth.uid();
$$;

-- =========================================================
-- RLS: organizations
-- =========================================================
alter table public.organizations enable row level security;

drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member" on public.organizations
  for select using (public.is_org_member(id));

drop policy if exists "organizations_insert_authenticated" on public.organizations;
create policy "organizations_insert_authenticated" on public.organizations
  for insert with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin" on public.organizations
  for update using (
    public.org_role_for(id) in ('owner', 'admin')
  );

drop policy if exists "organizations_delete_owner" on public.organizations;
create policy "organizations_delete_owner" on public.organizations
  for delete using (public.org_role_for(id) = 'owner');

-- =========================================================
-- RLS: org_members
-- =========================================================
alter table public.org_members enable row level security;

drop policy if exists "org_members_select_member" on public.org_members;
create policy "org_members_select_member" on public.org_members
  for select using (public.is_org_member(org_id));

-- A user can insert themselves as the first member when creating an org
-- (the policy on organizations.insert ensures the caller is the creator)
drop policy if exists "org_members_insert_self_or_admin" on public.org_members;
create policy "org_members_insert_self_or_admin" on public.org_members
  for insert with check (
    user_id = auth.uid()
    or public.org_role_for(org_id) in ('owner', 'admin')
  );

drop policy if exists "org_members_update_admin" on public.org_members;
create policy "org_members_update_admin" on public.org_members
  for update using (public.org_role_for(org_id) in ('owner', 'admin'));

drop policy if exists "org_members_delete_admin_or_self" on public.org_members;
create policy "org_members_delete_admin_or_self" on public.org_members
  for delete using (
    user_id = auth.uid()
    or public.org_role_for(org_id) in ('owner', 'admin')
  );

-- =========================================================
-- Bootstrap: when an organization is created, add creator as owner
-- =========================================================
create or replace function public.bootstrap_org_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.org_members (org_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (org_id, user_id) do nothing;

  -- Also set as the user's active org if they don't have one
  update public.profiles
  set active_org_id = new.id
  where id = new.created_by and active_org_id is null;

  return new;
end;
$$;

drop trigger if exists trg_bootstrap_org_owner on public.organizations;
create trigger trg_bootstrap_org_owner
  after insert on public.organizations
  for each row execute function public.bootstrap_org_owner();

-- =========================================================
-- updated_at trigger
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_organizations_updated on public.organizations;
create trigger trg_organizations_updated
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- =========================================================
-- Storage bucket for org logos
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-logos',
  'org-logos',
  true,
  2097152, -- 2MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS: only org admins/owners can upload; anyone can read (bucket is public)
-- File path convention: <org_id>/<filename>
drop policy if exists "org_logos_read_public" on storage.objects;
create policy "org_logos_read_public" on storage.objects
  for select using (bucket_id = 'org-logos');

drop policy if exists "org_logos_insert_admin" on storage.objects;
create policy "org_logos_insert_admin" on storage.objects
  for insert with check (
    bucket_id = 'org-logos'
    and public.org_role_for((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  );

drop policy if exists "org_logos_update_admin" on storage.objects;
create policy "org_logos_update_admin" on storage.objects
  for update using (
    bucket_id = 'org-logos'
    and public.org_role_for((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  );

drop policy if exists "org_logos_delete_admin" on storage.objects;
create policy "org_logos_delete_admin" on storage.objects
  for delete using (
    bucket_id = 'org-logos'
    and public.org_role_for((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  );
