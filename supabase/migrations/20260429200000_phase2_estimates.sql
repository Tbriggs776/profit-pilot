-- Phase 2: customers + estimates as first-class objects

-- =========================================================
-- estimate_status enum
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estimate_status') then
    create type public.estimate_status as enum ('draft', 'sent', 'won', 'lost');
  end if;
end $$;

-- pg_trgm for fuzzy customer name search (must be created before the index)
create extension if not exists pg_trgm;

-- =========================================================
-- customers
-- =========================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_org_idx on public.customers (org_id);
create index if not exists customers_name_trgm_idx on public.customers using gin (name gin_trgm_ops);

alter table public.customers enable row level security;

drop policy if exists "customers_select_org" on public.customers;
create policy "customers_select_org" on public.customers
  for select using (public.is_org_member(org_id));

drop policy if exists "customers_insert_org" on public.customers;
create policy "customers_insert_org" on public.customers
  for insert with check (public.is_org_member(org_id) and created_by = auth.uid());

drop policy if exists "customers_update_org" on public.customers;
create policy "customers_update_org" on public.customers
  for update using (public.is_org_member(org_id));

drop policy if exists "customers_delete_org" on public.customers;
create policy "customers_delete_org" on public.customers
  for delete using (public.is_org_member(org_id));

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated
  before update on public.customers
  for each row execute function public.set_updated_at();

-- =========================================================
-- estimates
-- =========================================================
create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,

  title text not null,
  status public.estimate_status not null default 'draft',
  notes text,

  -- public sharing (Phase 4 will use this)
  public_token text unique,
  is_public boolean not null default false,

  -- Calculator inputs (snapshot)
  equipment numeric(12,2) not null default 0,
  material numeric(12,2) not null default 0,
  labor numeric(12,2) not null default 0,
  sub_contractor numeric(12,2) not null default 0,
  custom_pass_through numeric(12,2) not null default 0,
  commission_rate numeric(5,2) not null default 0,
  warranty_rate numeric(5,2) not null default 0,
  sales_tax_rate numeric(5,2) not null default 0,
  finance_rate numeric(5,2) not null default 0,
  gross_margin_rate numeric(5,2) not null default 25,

  -- Computed totals (cached for list views)
  selling_price numeric(12,2) not null default 0,
  finance_price numeric(12,2) not null default 0,
  margin_amount numeric(12,2) not null default 0,
  direct_costs numeric(12,2) not null default 0,
  total_costs numeric(12,2) not null default 0,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists estimates_org_idx on public.estimates (org_id);
create index if not exists estimates_customer_idx on public.estimates (customer_id);
create index if not exists estimates_status_idx on public.estimates (status);
create index if not exists estimates_updated_at_idx on public.estimates (updated_at desc);
create index if not exists estimates_public_token_idx on public.estimates (public_token) where public_token is not null;

alter table public.estimates enable row level security;

drop policy if exists "estimates_select_org" on public.estimates;
create policy "estimates_select_org" on public.estimates
  for select using (public.is_org_member(org_id));

-- Public read access via public_token (anon role) when is_public = true
drop policy if exists "estimates_select_public" on public.estimates;
create policy "estimates_select_public" on public.estimates
  for select using (is_public = true and public_token is not null);

drop policy if exists "estimates_insert_org" on public.estimates;
create policy "estimates_insert_org" on public.estimates
  for insert with check (public.is_org_member(org_id) and created_by = auth.uid());

drop policy if exists "estimates_update_org" on public.estimates;
create policy "estimates_update_org" on public.estimates
  for update using (public.is_org_member(org_id));

drop policy if exists "estimates_delete_org" on public.estimates;
create policy "estimates_delete_org" on public.estimates
  for delete using (public.is_org_member(org_id));

drop trigger if exists trg_estimates_updated on public.estimates;
create trigger trg_estimates_updated
  before update on public.estimates
  for each row execute function public.set_updated_at();

-- =========================================================
-- RPC: generate a public token for an estimate (used in Phase 4)
-- =========================================================
create or replace function public.estimate_enable_public(estimate_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text;
  est_org uuid;
begin
  select org_id into est_org from public.estimates where id = estimate_id;
  if est_org is null then
    raise exception 'estimate not found';
  end if;
  if not public.is_org_member(est_org) then
    raise exception 'not authorized';
  end if;

  -- 32 url-safe chars
  new_token := replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_');
  new_token := replace(new_token, '=', '');

  update public.estimates
  set public_token = new_token, is_public = true
  where id = estimate_id;

  return new_token;
end;
$$;

create or replace function public.estimate_disable_public(estimate_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  est_org uuid;
begin
  select org_id into est_org from public.estimates where id = estimate_id;
  if est_org is null then return; end if;
  if not public.is_org_member(est_org) then
    raise exception 'not authorized';
  end if;

  update public.estimates
  set is_public = false
  where id = estimate_id;
end;
$$;
