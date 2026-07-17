create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, name)
);

create index if not exists delivery_zones_store_active_idx on public.delivery_zones(store_id, is_active, name);

create trigger delivery_zones_set_updated_at
before update on public.delivery_zones
for each row execute function public.set_updated_at();

alter table public.delivery_zones enable row level security;

create policy delivery_zones_public_select on public.delivery_zones for select
  using ((is_active and exists (select 1 from public.stores s where s.id = delivery_zones.store_id and s.is_active)) or public.is_store_member(store_id));

create policy delivery_zones_staff_write on public.delivery_zones for all
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create or replace function public.add_store_member_by_email(
  p_store_id uuid,
  p_email text,
  p_role public.membership_role
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_membership_id uuid;
begin
  if not public.has_store_role(p_store_id, array['owner','admin']::public.membership_role[]) then
    raise exception 'not allowed';
  end if;

  if p_role = 'owner' and not public.has_store_role(p_store_id, array['owner']::public.membership_role[]) then
    raise exception 'only owners can grant owner role';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'user not found';
  end if;

  insert into public.store_memberships (store_id, user_id, role, is_active)
  values (p_store_id, v_user_id, p_role, true)
  on conflict (store_id, user_id) do update
  set role = excluded.role,
      is_active = true,
      updated_at = now()
  returning id into v_membership_id;

  return v_membership_id;
end;
$$;

revoke execute on function public.add_store_member_by_email(uuid, text, public.membership_role) from public;
grant execute on function public.add_store_member_by_email(uuid, text, public.membership_role) to authenticated;
