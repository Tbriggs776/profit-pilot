-- Phase 6: sub-contractor directory + per-estimate assignments

-- =========================================================
-- subcontractors directory (per organization)
-- =========================================================
create table if not exists public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,                -- contact / personal name
  business_name text,                -- legal business name (used on 1099)
  email text,
  phone text,
  address text,
  tax_id text,                       -- EIN or SSN (sensitive, used for 1099 prep)
  trade text,                        -- free text: "Electrician", "Plumber", etc.
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subcontractors_org_idx on public.subcontractors (org_id);
create index if not exists subcontractors_name_trgm_idx
  on public.subcontractors using gin (name gin_trgm_ops);

alter table public.subcontractors enable row level security;

drop policy if exists "subs_select_org" on public.subcontractors;
create policy "subs_select_org" on public.subcontractors
  for select using (public.is_org_member(org_id));

drop policy if exists "subs_insert_org" on public.subcontractors;
create policy "subs_insert_org" on public.subcontractors
  for insert with check (public.is_org_member(org_id) and created_by = auth.uid());

drop policy if exists "subs_update_org" on public.subcontractors;
create policy "subs_update_org" on public.subcontractors
  for update using (public.is_org_member(org_id));

drop policy if exists "subs_delete_org" on public.subcontractors;
create policy "subs_delete_org" on public.subcontractors
  for delete using (public.is_org_member(org_id));

drop trigger if exists trg_subs_updated on public.subcontractors;
create trigger trg_subs_updated
  before update on public.subcontractors
  for each row execute function public.set_updated_at();

-- =========================================================
-- sub_payment_status enum
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sub_payment_status') then
    create type public.sub_payment_status as enum ('unpaid', 'partial', 'paid');
  end if;
end $$;

-- =========================================================
-- estimate_subcontractor_assignments
-- Links a sub to a specific estimate w/ scope and payout tracking.
-- =========================================================
create table if not exists public.estimate_subcontractor_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  subcontractor_id uuid not null references public.subcontractors(id) on delete restrict,

  scope text,                        -- short description of the work
  amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  status public.sub_payment_status not null default 'unpaid',
  paid_at timestamptz,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subasn_estimate_idx
  on public.estimate_subcontractor_assignments (estimate_id);
create index if not exists subasn_sub_idx
  on public.estimate_subcontractor_assignments (subcontractor_id);
create index if not exists subasn_org_paid_idx
  on public.estimate_subcontractor_assignments (org_id, paid_at)
  where paid_at is not null;

alter table public.estimate_subcontractor_assignments enable row level security;

drop policy if exists "subasn_select_org" on public.estimate_subcontractor_assignments;
create policy "subasn_select_org" on public.estimate_subcontractor_assignments
  for select using (public.is_org_member(org_id));

drop policy if exists "subasn_insert_org" on public.estimate_subcontractor_assignments;
create policy "subasn_insert_org" on public.estimate_subcontractor_assignments
  for insert with check (public.is_org_member(org_id));

drop policy if exists "subasn_update_org" on public.estimate_subcontractor_assignments;
create policy "subasn_update_org" on public.estimate_subcontractor_assignments
  for update using (public.is_org_member(org_id));

drop policy if exists "subasn_delete_org" on public.estimate_subcontractor_assignments;
create policy "subasn_delete_org" on public.estimate_subcontractor_assignments
  for delete using (public.is_org_member(org_id));

drop trigger if exists trg_subasn_updated on public.estimate_subcontractor_assignments;
create trigger trg_subasn_updated
  before update on public.estimate_subcontractor_assignments
  for each row execute function public.set_updated_at();

-- =========================================================
-- Annual payout summary view (per sub, per year, for the caller's orgs)
-- Used for 1099 prep.
-- =========================================================
create or replace view public.subcontractor_annual_payouts
with (security_invoker = true)
as
  select
    a.org_id,
    a.subcontractor_id,
    s.name,
    s.business_name,
    s.tax_id,
    s.trade,
    extract(year from a.paid_at)::int as payout_year,
    sum(a.amount_paid)::numeric(14,2) as total_paid,
    count(*)::int as assignment_count
  from public.estimate_subcontractor_assignments a
  join public.subcontractors s on s.id = a.subcontractor_id
  where a.paid_at is not null and a.amount_paid > 0
  group by a.org_id, a.subcontractor_id, s.name, s.business_name,
           s.tax_id, s.trade, payout_year;
