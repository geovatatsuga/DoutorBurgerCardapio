-- Administrative bootstrap for the first BurgerC owner.
--
-- This script is intentionally outside supabase/migrations so it is NOT applied
-- automatically by `supabase db push` or by normal environment bootstraps.
--
-- Manual use only:
-- 1. Create the owner user first through Supabase Auth.
-- 2. Replace the placeholder below:
--      OWNER_EMAIL_HERE
--    with the exact e-mail address of that existing Auth user.
-- 3. Review the values for the first store.
-- 4. Execute this script manually in the Supabase SQL editor or with an
--    authenticated administrative database session.
--
-- Security notes:
-- - No password, token, service role key, or secret is stored here.
-- - This does not create any RLS policy and does not allow user autopromotion.
-- - The owner association is inserted by an administrator, not by the frontend.
-- - The script is idempotent: it avoids duplicate stores and duplicate
--   memberships by relying on the existing unique constraints.

begin;

do $$
declare
  v_owner_email text := 'OWNER_EMAIL_HERE';
  v_owner_id uuid;
  v_store_id uuid;
begin
  if v_owner_email = 'OWNER_EMAIL_HERE' or length(trim(v_owner_email)) = 0 then
    raise exception 'Replace OWNER_EMAIL_HERE with the existing owner e-mail before running this script.';
  end if;

  select u.id
    into v_owner_id
  from auth.users u
  where lower(u.email) = lower(trim(v_owner_email))
  limit 1;

  if v_owner_id is null then
    raise exception 'No auth.users row found for e-mail: %', v_owner_email;
  end if;

  insert into public.stores (
    slug,
    name,
    phone,
    address,
    min_order_cents,
    delivery_fee_cents,
    delivery_time_label,
    is_active
  )
  values (
    'burgerc',
    'BurgerC',
    null,
    null,
    0,
    0,
    '35-45 min',
    true
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    is_active = true
  returning id into v_store_id;

  insert into public.store_memberships (
    store_id,
    user_id,
    role,
    is_active
  )
  values (
    v_store_id,
    v_owner_id,
    'owner'::public.membership_role,
    true
  )
  on conflict (store_id, user_id) do update
  set
    role = 'owner'::public.membership_role,
    is_active = true,
    updated_at = now();

  raise notice 'BurgerC bootstrap complete. store_id=%, owner_email=%', v_store_id, v_owner_email;
end $$;

commit;
