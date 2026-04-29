-- Fix estimate_enable_public RPC: gen_random_bytes is in the pgcrypto
-- extension's schema, which isn't always on the search path. Use
-- gen_random_uuid() (Postgres 13+ built-in) instead — two calls give
-- 64 hex chars of entropy, plenty for a public share token.

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

  -- 64 hex chars, url-safe by construction (no dashes after replace)
  new_token := replace(gen_random_uuid()::text, '-', '')
            || replace(gen_random_uuid()::text, '-', '');

  update public.estimates
  set public_token = new_token, is_public = true
  where id = estimate_id;

  return new_token;
end;
$$;
