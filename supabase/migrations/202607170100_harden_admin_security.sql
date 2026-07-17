-- Harden administrative permissions.
-- Keep public reads for the storefront and controlled RPCs for sensitive writes.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_store_member(uuid) from public, anon, authenticated;
revoke execute on function public.has_store_role(uuid, public.membership_role[]) from public, anon, authenticated;
revoke execute on function public.can_access_order(uuid) from public, anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists memberships_admin_insert on public.store_memberships;
drop policy if exists memberships_admin_update on public.store_memberships;
drop policy if exists orders_staff_update on public.orders;

drop policy if exists categories_staff_write on public.categories;
drop policy if exists products_staff_write on public.products;
drop policy if exists modifier_groups_staff_write on public.modifier_groups;
drop policy if exists modifier_options_staff_write on public.modifier_options;
drop policy if exists product_modifier_groups_staff_write on public.product_modifier_groups;
drop policy if exists store_hours_staff_write on public.store_hours;
drop policy if exists delivery_zones_staff_write on public.delivery_zones;

create policy categories_staff_insert on public.categories for insert
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));
create policy categories_staff_update on public.categories for update
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create policy products_staff_insert on public.products for insert
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));
create policy products_staff_update on public.products for update
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create policy modifier_groups_staff_insert on public.modifier_groups for insert
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));
create policy modifier_groups_staff_update on public.modifier_groups for update
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create policy modifier_options_staff_insert on public.modifier_options for insert
  with check (exists (
    select 1 from public.modifier_groups mg
    where mg.id = modifier_options.group_id
      and public.has_store_role(mg.store_id, array['owner','admin','manager']::public.membership_role[])
  ));
create policy modifier_options_staff_update on public.modifier_options for update
  using (exists (
    select 1 from public.modifier_groups mg
    where mg.id = modifier_options.group_id
      and public.has_store_role(mg.store_id, array['owner','admin','manager']::public.membership_role[])
  ))
  with check (exists (
    select 1 from public.modifier_groups mg
    where mg.id = modifier_options.group_id
      and public.has_store_role(mg.store_id, array['owner','admin','manager']::public.membership_role[])
  ));

create policy product_modifier_groups_staff_insert on public.product_modifier_groups for insert
  with check (exists (
    select 1 from public.products p
    where p.id = product_modifier_groups.product_id
      and public.has_store_role(p.store_id, array['owner','admin','manager']::public.membership_role[])
  ));
create policy product_modifier_groups_staff_update on public.product_modifier_groups for update
  using (exists (
    select 1 from public.products p
    where p.id = product_modifier_groups.product_id
      and public.has_store_role(p.store_id, array['owner','admin','manager']::public.membership_role[])
  ))
  with check (exists (
    select 1 from public.products p
    where p.id = product_modifier_groups.product_id
      and public.has_store_role(p.store_id, array['owner','admin','manager']::public.membership_role[])
  ));

create policy store_hours_staff_insert on public.store_hours for insert
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));
create policy store_hours_staff_update on public.store_hours for update
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create policy delivery_zones_staff_insert on public.delivery_zones for insert
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));
create policy delivery_zones_staff_update on public.delivery_zones for update
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create or replace function public.set_store_member_active(
  p_membership_id uuid,
  p_is_active boolean
)
returns public.store_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.store_memberships%rowtype;
  v_active_owner_count integer;
begin
  select * into v_membership
  from public.store_memberships
  where id = p_membership_id
  for update;

  if not found then
    raise exception 'membership not found';
  end if;

  if not public.has_store_role(v_membership.store_id, array['owner','admin']::public.membership_role[]) then
    raise exception 'not allowed';
  end if;

  if v_membership.role = 'owner' and p_is_active = false then
    select count(*) into v_active_owner_count
    from public.store_memberships
    where store_id = v_membership.store_id
      and role = 'owner'
      and is_active
      and id <> p_membership_id;

    if v_active_owner_count = 0 then
      raise exception 'cannot disable the last active owner';
    end if;
  end if;

  update public.store_memberships
  set is_active = p_is_active
  where id = p_membership_id
  returning * into v_membership;

  return v_membership;
end;
$$;

revoke execute on function public.set_store_member_active(uuid, boolean) from public;
grant execute on function public.set_store_member_active(uuid, boolean) to authenticated;
