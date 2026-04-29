-- Phase 5: estimate templates + curated built-in seed library

-- =========================================================
-- estimate_templates
-- org_id null  => built-in / global template (read-only for end users)
-- org_id set   => user-saved template owned by that organization
-- =========================================================
create table if not exists public.estimate_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  contractor_type public.contractor_type,
  name text not null,
  description text,

  -- Snapshot of rate defaults (NULL = inherit from org/calculator default)
  commission_rate numeric(5,2),
  warranty_rate numeric(5,2),
  sales_tax_rate numeric(5,2),
  finance_rate numeric(5,2),
  gross_margin_rate numeric(5,2),

  is_built_in boolean not null default false,
  sort_order int not null default 0,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_contractor_type_idx
  on public.estimate_templates (contractor_type, is_built_in, sort_order);
create index if not exists templates_org_idx
  on public.estimate_templates (org_id) where org_id is not null;

alter table public.estimate_templates enable row level security;

drop policy if exists "templates_select" on public.estimate_templates;
create policy "templates_select" on public.estimate_templates
  for select using (
    is_built_in = true
    or (org_id is not null and public.is_org_member(org_id))
  );

drop policy if exists "templates_insert_org" on public.estimate_templates;
create policy "templates_insert_org" on public.estimate_templates
  for insert with check (
    is_built_in = false
    and org_id is not null
    and public.is_org_member(org_id)
    and created_by = auth.uid()
  );

drop policy if exists "templates_update_org" on public.estimate_templates;
create policy "templates_update_org" on public.estimate_templates
  for update using (
    is_built_in = false
    and org_id is not null
    and public.is_org_member(org_id)
  );

drop policy if exists "templates_delete_org" on public.estimate_templates;
create policy "templates_delete_org" on public.estimate_templates
  for delete using (
    is_built_in = false
    and org_id is not null
    and public.is_org_member(org_id)
  );

drop trigger if exists trg_templates_updated on public.estimate_templates;
create trigger trg_templates_updated
  before update on public.estimate_templates
  for each row execute function public.set_updated_at();

-- =========================================================
-- estimate_template_lines
-- =========================================================
create table if not exists public.estimate_template_lines (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.estimate_templates(id) on delete cascade,
  category public.line_item_category not null,
  description text not null default '',
  quantity numeric(12,3) not null default 1,
  unit text default 'ea',
  unit_price numeric(12,2) not null default 0,
  taxable boolean not null default true,
  sort_order int not null default 0
);

create index if not exists template_lines_template_idx
  on public.estimate_template_lines (template_id, sort_order);

alter table public.estimate_template_lines enable row level security;

-- Read access mirrors the template's read access
drop policy if exists "template_lines_select" on public.estimate_template_lines;
create policy "template_lines_select" on public.estimate_template_lines
  for select using (
    exists (
      select 1 from public.estimate_templates t
      where t.id = estimate_template_lines.template_id
        and (
          t.is_built_in = true
          or (t.org_id is not null and public.is_org_member(t.org_id))
        )
    )
  );

drop policy if exists "template_lines_insert_org" on public.estimate_template_lines;
create policy "template_lines_insert_org" on public.estimate_template_lines
  for insert with check (
    exists (
      select 1 from public.estimate_templates t
      where t.id = template_id
        and t.is_built_in = false
        and t.org_id is not null
        and public.is_org_member(t.org_id)
    )
  );

drop policy if exists "template_lines_update_org" on public.estimate_template_lines;
create policy "template_lines_update_org" on public.estimate_template_lines
  for update using (
    exists (
      select 1 from public.estimate_templates t
      where t.id = template_id
        and t.is_built_in = false
        and t.org_id is not null
        and public.is_org_member(t.org_id)
    )
  );

drop policy if exists "template_lines_delete_org" on public.estimate_template_lines;
create policy "template_lines_delete_org" on public.estimate_template_lines
  for delete using (
    exists (
      select 1 from public.estimate_templates t
      where t.id = template_id
        and t.is_built_in = false
        and t.org_id is not null
        and public.is_org_member(t.org_id)
    )
  );

-- =========================================================
-- Seed: built-in templates per contractor type
-- Idempotent: only insert when name doesn't already exist as a built-in.
-- =========================================================
do $$
declare
  v_id uuid;
begin
  -- ---------- HVAC: 80k BTU Furnace Replacement ----------
  if not exists (
    select 1 from public.estimate_templates
    where is_built_in and name = 'Furnace replacement (80k BTU)'
  ) then
    insert into public.estimate_templates
      (contractor_type, name, description, gross_margin_rate, sort_order, is_built_in)
    values ('hvac', 'Furnace replacement (80k BTU)',
      'Standard 80,000 BTU gas furnace swap with thermostat and basic venting.',
      30, 10, true)
    returning id into v_id;
    insert into public.estimate_template_lines
      (template_id, category, description, quantity, unit, unit_price, taxable, sort_order)
    values
      (v_id, 'equipment', '80k BTU 95% AFUE gas furnace', 1, 'ea', 1800, true, 0),
      (v_id, 'equipment', 'Smart thermostat', 1, 'ea', 220, true, 1),
      (v_id, 'material', 'Vent pipe + fittings (PVC)', 1, 'kit', 95, true, 0),
      (v_id, 'material', 'Gas flex line + shutoff', 1, 'kit', 60, true, 1),
      (v_id, 'material', 'Misc. fasteners + sealant', 1, 'lot', 35, true, 2),
      (v_id, 'labor', 'Removal + install', 6, 'hr', 110, false, 0),
      (v_id, 'labor', 'Commissioning + customer walk-through', 1, 'hr', 110, false, 1);
  end if;

  -- ---------- HVAC: 3-ton AC condenser swap ----------
  if not exists (
    select 1 from public.estimate_templates
    where is_built_in and name = 'AC condenser swap (3 ton)'
  ) then
    insert into public.estimate_templates
      (contractor_type, name, description, gross_margin_rate, sort_order, is_built_in)
    values ('hvac', 'AC condenser swap (3 ton)',
      '3-ton condenser unit replacement, line set kit, refrigerant charge.',
      30, 20, true)
    returning id into v_id;
    insert into public.estimate_template_lines
      (template_id, category, description, quantity, unit, unit_price, taxable, sort_order)
    values
      (v_id, 'equipment', '3-ton 14 SEER condenser', 1, 'ea', 1900, true, 0),
      (v_id, 'equipment', 'Line set kit', 1, 'ea', 220, true, 1),
      (v_id, 'material', 'R-410A refrigerant charge', 1, 'lot', 120, true, 0),
      (v_id, 'material', 'Mounting pad + brackets', 1, 'lot', 60, true, 1),
      (v_id, 'labor', 'Removal + install + brazing', 5, 'hr', 110, false, 0),
      (v_id, 'labor', 'Vacuum + start-up', 1, 'hr', 110, false, 1);
  end if;

  -- ---------- HVAC: Mini-split single zone ----------
  if not exists (
    select 1 from public.estimate_templates
    where is_built_in and name = 'Mini-split (single zone, 12k BTU)'
  ) then
    insert into public.estimate_templates
      (contractor_type, name, description, gross_margin_rate, sort_order, is_built_in)
    values ('hvac', 'Mini-split (single zone, 12k BTU)',
      'Single-head ductless mini-split with line set and electrical.',
      32, 30, true)
    returning id into v_id;
    insert into public.estimate_template_lines
      (template_id, category, description, quantity, unit, unit_price, taxable, sort_order)
    values
      (v_id, 'equipment', '12k BTU mini-split (indoor + outdoor)', 1, 'ea', 1450, true, 0),
      (v_id, 'material', 'Line set 25 ft', 1, 'ea', 165, true, 0),
      (v_id, 'material', 'Whip + disconnect + breaker', 1, 'kit', 85, true, 1),
      (v_id, 'labor', 'Mount + install + commission', 6, 'hr', 110, false, 0);
  end if;

  -- ---------- Plumbing: 50 gal water heater ----------
  if not exists (
    select 1 from public.estimate_templates
    where is_built_in and name = 'Water heater replacement (50 gal)'
  ) then
    insert into public.estimate_templates
      (contractor_type, name, description, gross_margin_rate, sort_order, is_built_in)
    values ('plumbing', 'Water heater replacement (50 gal)',
      '50 gallon natural gas water heater swap with code-required upgrades.',
      28, 10, true)
    returning id into v_id;
    insert into public.estimate_template_lines
      (template_id, category, description, quantity, unit, unit_price, taxable, sort_order)
    values
      (v_id, 'equipment', '50 gal natural gas water heater', 1, 'ea', 950, true, 0),
      (v_id, 'material', 'Expansion tank', 1, 'ea', 75, true, 0),
      (v_id, 'material', 'T&P valve + supply lines', 1, 'kit', 55, true, 1),
      (v_id, 'material', 'Vent pipe + fittings', 1, 'kit', 80, true, 2),
      (v_id, 'labor', 'Drain old + haul + install', 4, 'hr', 105, false, 0),
      (v_id, 'sub_contractor', 'Permit fee', 1, 'ea', 75, false, 0);
  end if;

  -- ---------- Plumbing: Toilet replacement ----------
  if not exists (
    select 1 from public.estimate_templates
    where is_built_in and name = 'Toilet replacement'
  ) then
    insert into public.estimate_templates
      (contractor_type, name, description, gross_margin_rate, sort_order, is_built_in)
    values ('plumbing', 'Toilet replacement',
      'Standard 1.28 GPF two-piece toilet swap.',
      30, 20, true)
    returning id into v_id;
    insert into public.estimate_template_lines
      (template_id, category, description, quantity, unit, unit_price, taxable, sort_order)
    values
      (v_id, 'equipment', '1.28 GPF two-piece toilet', 1, 'ea', 240, true, 0),
      (v_id, 'material', 'Wax ring + bolts + supply line', 1, 'kit', 25, true, 0),
      (v_id, 'labor', 'Removal + install', 1.5, 'hr', 105, false, 0);
  end if;

  -- ---------- Electrical: 200A panel upgrade ----------
  if not exists (
    select 1 from public.estimate_templates
    where is_built_in and name = '200A panel upgrade'
  ) then
    insert into public.estimate_templates
      (contractor_type, name, description, gross_margin_rate, sort_order, is_built_in)
    values ('electrical', '200A panel upgrade',
      'Replace existing service panel with 200A main, 30/40-space panel.',
      32, 10, true)
    returning id into v_id;
    insert into public.estimate_template_lines
      (template_id, category, description, quantity, unit, unit_price, taxable, sort_order)
    values
      (v_id, 'equipment', '200A 30/40-space panel', 1, 'ea', 380, true, 0),
      (v_id, 'equipment', 'Breakers (assorted)', 1, 'lot', 280, true, 1),
      (v_id, 'material', 'Service entrance cable + meter base', 1, 'kit', 240, true, 0),
      (v_id, 'material', 'Ground rod + clamp', 1, 'ea', 35, true, 1),
      (v_id, 'labor', 'Permit, install, inspection coord.', 8, 'hr', 125, false, 0),
      (v_id, 'sub_contractor', 'Permit fee', 1, 'ea', 175, false, 0);
  end if;

  -- ---------- Electrical: EV charger (level 2) ----------
  if not exists (
    select 1 from public.estimate_templates
    where is_built_in and name = 'EV charger install (level 2)'
  ) then
    insert into public.estimate_templates
      (contractor_type, name, description, gross_margin_rate, sort_order, is_built_in)
    values ('electrical', 'EV charger install (level 2)',
      '40A hardwired level 2 EV charger with 50A breaker.',
      32, 20, true)
    returning id into v_id;
    insert into public.estimate_template_lines
      (template_id, category, description, quantity, unit, unit_price, taxable, sort_order)
    values
      (v_id, 'equipment', 'Level 2 EV charger 40A', 1, 'ea', 550, true, 0),
      (v_id, 'equipment', '50A 2-pole breaker', 1, 'ea', 45, true, 1),
      (v_id, 'material', '#6 THHN wire run', 30, 'ft', 4.50, true, 0),
      (v_id, 'material', 'Conduit + fittings', 1, 'kit', 60, true, 1),
      (v_id, 'labor', 'Run + terminate + commission', 4, 'hr', 125, false, 0);
  end if;

  -- ---------- Roofing: Asphalt shingle replacement ----------
  if not exists (
    select 1 from public.estimate_templates
    where is_built_in and name = 'Asphalt shingle reroof (per square)'
  ) then
    insert into public.estimate_templates
      (contractor_type, name, description, gross_margin_rate, sort_order, is_built_in)
    values ('roofing', 'Asphalt shingle reroof (per square)',
      'Per-square pricing for asphalt shingle tear-off and replacement. Adjust quantities to roof size.',
      35, 10, true)
    returning id into v_id;
    insert into public.estimate_template_lines
      (template_id, category, description, quantity, unit, unit_price, taxable, sort_order)
    values
      (v_id, 'material', 'Architectural shingles', 1, 'sq', 95, true, 0),
      (v_id, 'material', 'Synthetic underlayment', 1, 'sq', 22, true, 1),
      (v_id, 'material', 'Drip edge + ridge cap', 1, 'sq', 18, true, 2),
      (v_id, 'material', 'Nails + flashing + sealant', 1, 'sq', 12, true, 3),
      (v_id, 'labor', 'Tear-off + install', 2.5, 'hr', 95, false, 0),
      (v_id, 'sub_contractor', 'Dumpster + debris haul (per square)', 1, 'sq', 35, false, 0);
  end if;

  -- ---------- Painting: Interior repaint per room ----------
  if not exists (
    select 1 from public.estimate_templates
    where is_built_in and name = 'Interior repaint (per room)'
  ) then
    insert into public.estimate_templates
      (contractor_type, name, description, gross_margin_rate, sort_order, is_built_in)
    values ('painting', 'Interior repaint (per room)',
      'Standard 12x12 room: walls + trim, two coats.',
      40, 10, true)
    returning id into v_id;
    insert into public.estimate_template_lines
      (template_id, category, description, quantity, unit, unit_price, taxable, sort_order)
    values
      (v_id, 'material', 'Premium interior paint', 2, 'gal', 55, true, 0),
      (v_id, 'material', 'Primer', 1, 'gal', 40, true, 1),
      (v_id, 'material', 'Tape + plastic + drop cloth', 1, 'kit', 25, true, 2),
      (v_id, 'labor', 'Prep + cut-in + roll (two coats)', 8, 'hr', 65, false, 0);
  end if;

  -- ---------- General: Bathroom remodel (skeleton) ----------
  if not exists (
    select 1 from public.estimate_templates
    where is_built_in and name = 'Bathroom remodel (skeleton)'
  ) then
    insert into public.estimate_templates
      (contractor_type, name, description, gross_margin_rate, sort_order, is_built_in)
    values ('general', 'Bathroom remodel (skeleton)',
      'Starting structure for a mid-range full-bath remodel. Replace placeholders with real selections.',
      28, 10, true)
    returning id into v_id;
    insert into public.estimate_template_lines
      (template_id, category, description, quantity, unit, unit_price, taxable, sort_order)
    values
      (v_id, 'equipment', 'Vanity + top', 1, 'ea', 750, true, 0),
      (v_id, 'equipment', 'Toilet', 1, 'ea', 280, true, 1),
      (v_id, 'equipment', 'Tub or shower base', 1, 'ea', 800, true, 2),
      (v_id, 'equipment', 'Tile + fixtures package', 1, 'lot', 1500, true, 3),
      (v_id, 'material', 'Drywall + cement board', 1, 'lot', 250, true, 0),
      (v_id, 'material', 'Paint + finish supplies', 1, 'lot', 180, true, 1),
      (v_id, 'labor', 'Demo', 8, 'hr', 90, false, 0),
      (v_id, 'labor', 'Plumbing rough', 6, 'hr', 110, false, 1),
      (v_id, 'labor', 'Tile + fixture install', 16, 'hr', 95, false, 2),
      (v_id, 'labor', 'Finish + paint + punch', 8, 'hr', 85, false, 3),
      (v_id, 'sub_contractor', 'Electrician (GFCI + lighting)', 1, 'ea', 450, false, 0);
  end if;
end $$;
