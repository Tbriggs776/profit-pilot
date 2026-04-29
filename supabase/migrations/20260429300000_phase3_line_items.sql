-- Phase 3: itemized line items per estimate
-- Each cost category (equipment, material, labor, sub_contractor, custom_pass_through)
-- can be broken down into qty x unit_price rows.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'line_item_category') then
    create type public.line_item_category as enum (
      'equipment', 'material', 'labor', 'sub_contractor', 'custom_pass_through'
    );
  end if;
end $$;

create table if not exists public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  -- denormalized for cheap RLS checks
  org_id uuid not null references public.organizations(id) on delete cascade,

  category public.line_item_category not null,
  description text not null default '',
  quantity numeric(12,3) not null default 1,
  unit text default 'ea',
  unit_price numeric(12,2) not null default 0,
  -- whether sales tax applies to this line (default true for equipment/material, false for labor/sub)
  taxable boolean not null default true,
  sort_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists eli_estimate_idx
  on public.estimate_line_items (estimate_id, category, sort_order);
create index if not exists eli_org_idx on public.estimate_line_items (org_id);

alter table public.estimate_line_items enable row level security;

drop policy if exists "eli_select_org" on public.estimate_line_items;
create policy "eli_select_org" on public.estimate_line_items
  for select using (public.is_org_member(org_id));

-- public read when parent estimate is shared
drop policy if exists "eli_select_public" on public.estimate_line_items;
create policy "eli_select_public" on public.estimate_line_items
  for select using (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_line_items.estimate_id
        and e.is_public = true
        and e.public_token is not null
    )
  );

drop policy if exists "eli_insert_org" on public.estimate_line_items;
create policy "eli_insert_org" on public.estimate_line_items
  for insert with check (public.is_org_member(org_id));

drop policy if exists "eli_update_org" on public.estimate_line_items;
create policy "eli_update_org" on public.estimate_line_items
  for update using (public.is_org_member(org_id));

drop policy if exists "eli_delete_org" on public.estimate_line_items;
create policy "eli_delete_org" on public.estimate_line_items
  for delete using (public.is_org_member(org_id));

drop trigger if exists trg_eli_updated on public.estimate_line_items;
create trigger trg_eli_updated
  before update on public.estimate_line_items
  for each row execute function public.set_updated_at();
