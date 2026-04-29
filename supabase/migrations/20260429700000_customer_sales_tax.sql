-- Phase 7: separate customer-charged sales tax from cost-side sales tax
--
-- Existing `sales_tax_rate` is the tax the contractor PAYS on purchases
-- (folded into the cost basis before margin). This adds a second tax that
-- the contractor CHARGES the customer on retail-priced taxable items, shown
-- as a separate line on the customer-facing PDF and public estimate.

alter table public.estimates
  add column if not exists customer_sales_tax_rate numeric(5,2) not null default 0,
  add column if not exists customer_sales_tax numeric(12,2) not null default 0,
  add column if not exists grand_total numeric(12,2) not null default 0;

-- Backfill grand_total = selling_price for existing rows (customer tax = 0)
update public.estimates
set grand_total = selling_price
where grand_total = 0 and selling_price > 0;

alter table public.organizations
  add column if not exists default_customer_tax_rate numeric(5,2) not null default 0;
