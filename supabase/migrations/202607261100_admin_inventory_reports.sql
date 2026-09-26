-- Professional administration layer for inventory, suppliers and reports.
-- Keeps the initial schema untouched and extends the CMV/stock migrations.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  whatsapp text,
  tax_id text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, name)
);

alter table public.raw_materials
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists purchase_unit text,
  add column if not exists recipe_unit text,
  add column if not exists purchase_to_recipe_factor numeric(14,6) not null default 1 check (purchase_to_recipe_factor > 0),
  add column if not exists target_margin_percent numeric(6,2) not null default 0 check (target_margin_percent >= 0);

alter table public.product_recipe_items
  add column if not exists preparation_notes text;

alter table public.stock_movements
  add column if not exists stock_before_quantity numeric(12,3),
  add column if not exists stock_after_quantity numeric(12,3),
  add column if not exists reason text;

alter table public.raw_materials
  drop constraint if exists raw_materials_unit_supported,
  add constraint raw_materials_unit_supported
    check (unit in ('g','kg','ml','L','un','porção'));

alter table public.raw_materials
  drop constraint if exists raw_materials_purchase_unit_supported,
  add constraint raw_materials_purchase_unit_supported
    check (purchase_unit is null or purchase_unit in ('g','kg','ml','L','un','porção'));

alter table public.raw_materials
  drop constraint if exists raw_materials_recipe_unit_supported,
  add constraint raw_materials_recipe_unit_supported
    check (recipe_unit is null or recipe_unit in ('g','kg','ml','L','un','porção'));

alter table public.stock_movements
  drop constraint if exists stock_movements_after_nonnegative,
  add constraint stock_movements_after_nonnegative
    check (stock_after_quantity is null or stock_after_quantity >= 0);

create index if not exists suppliers_store_active_idx
  on public.suppliers(store_id, is_active, name);

create index if not exists raw_materials_supplier_idx
  on public.raw_materials(supplier_id)
  where supplier_id is not null;

create index if not exists stock_movements_material_created_idx
  on public.stock_movements(raw_material_id, created_at desc);

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;

drop policy if exists suppliers_manager_select on public.suppliers;
create policy suppliers_manager_select on public.suppliers for select
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

drop policy if exists suppliers_manager_insert on public.suppliers;
create policy suppliers_manager_insert on public.suppliers for insert
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

drop policy if exists suppliers_manager_update on public.suppliers;
create policy suppliers_manager_update on public.suppliers for update
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

drop policy if exists stock_movements_staff_select on public.stock_movements;
drop policy if exists stock_movements_manager_select on public.stock_movements;
create policy stock_movements_manager_select on public.stock_movements for select
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

drop policy if exists stock_movements_manager_insert on public.stock_movements;
create policy stock_movements_manager_insert on public.stock_movements for insert
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

grant select, insert, update on public.suppliers to authenticated;
grant select on public.stock_movements to authenticated;

create or replace function public.can_manage_store_inventory(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_store_role(
    p_store_id,
    array['owner','admin','manager']::public.membership_role[]
  );
$$;

revoke execute on function public.can_manage_store_inventory(uuid) from public;
grant execute on function public.can_manage_store_inventory(uuid) to authenticated;

create or replace function public.fill_stock_movement_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_stock numeric(12,3);
begin
  select stock_quantity
  into v_current_stock
  from public.raw_materials
  where id = new.raw_material_id
    and store_id = new.store_id;

  if not found then
    raise exception 'raw material not found for store';
  end if;

  new.stock_before_quantity := coalesce(new.stock_before_quantity, v_current_stock);
  new.stock_after_quantity := coalesce(new.stock_after_quantity, new.stock_before_quantity + new.quantity);
  new.reason := nullif(trim(coalesce(new.reason, new.notes, '')), '');

  if new.stock_after_quantity < 0 then
    raise exception 'stock movement would make inventory negative';
  end if;

  return new;
end;
$$;

drop trigger if exists stock_movements_fill_snapshot on public.stock_movements;
create trigger stock_movements_fill_snapshot
before insert on public.stock_movements
for each row execute function public.fill_stock_movement_snapshot();

create or replace function public.record_stock_movement(
  p_store_id uuid,
  p_raw_material_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost_cents integer default null,
  p_reason text default null,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material public.raw_materials%rowtype;
  v_movement public.stock_movements%rowtype;
  v_before numeric(12,3);
  v_after numeric(12,3);
begin
  if not public.can_manage_store_inventory(p_store_id) then
    raise exception 'not allowed';
  end if;

  if p_movement_type not in ('purchase','adjustment','waste','recipe_use') then
    raise exception 'invalid movement type';
  end if;

  if p_quantity = 0 then
    raise exception 'quantity cannot be zero';
  end if;

  select *
  into v_material
  from public.raw_materials
  where id = p_raw_material_id
    and store_id = p_store_id
  for update;

  if not found then
    raise exception 'raw material not found';
  end if;

  v_before := v_material.stock_quantity;
  v_after := v_before + p_quantity;

  if v_after < 0 then
    raise exception 'stock movement would make inventory negative';
  end if;

  insert into public.stock_movements (
    store_id,
    raw_material_id,
    movement_type,
    quantity,
    unit_cost_cents,
    reference_type,
    reference_id,
    notes,
    reason,
    stock_before_quantity,
    stock_after_quantity,
    created_by
  )
  values (
    p_store_id,
    p_raw_material_id,
    p_movement_type,
    p_quantity,
    p_unit_cost_cents,
    p_reference_type,
    p_reference_id,
    nullif(trim(coalesce(p_reason, '')), ''),
    nullif(trim(coalesce(p_reason, '')), ''),
    v_before,
    v_after,
    auth.uid()
  )
  returning * into v_movement;

  update public.raw_materials
  set stock_quantity = v_after,
      cost_per_unit_cents = case
        when p_movement_type = 'purchase' and p_unit_cost_cents is not null then p_unit_cost_cents
        else cost_per_unit_cents
      end
  where id = p_raw_material_id;

  insert into public.audit_logs (store_id, actor_id, action, entity_table, entity_id, before_data, after_data)
  values (
    p_store_id,
    auth.uid(),
    'record_stock_movement',
    'stock_movements',
    v_movement.id,
    jsonb_build_object('stock_quantity', v_before),
    jsonb_build_object('stock_quantity', v_after, 'movement_type', p_movement_type, 'quantity', p_quantity)
  );

  return v_movement;
end;
$$;

revoke execute on function public.record_stock_movement(uuid, uuid, text, numeric, integer, text, text, uuid) from public;
grant execute on function public.record_stock_movement(uuid, uuid, text, numeric, integer, text, text, uuid) to authenticated;

create or replace function public.admin_stock_movements_report(
  p_store_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns table (
  movement_id uuid,
  created_at timestamptz,
  material_name text,
  supplier_name text,
  movement_type text,
  quantity numeric,
  unit text,
  stock_before_quantity numeric,
  stock_after_quantity numeric,
  unit_cost_cents integer,
  reference_type text,
  reference_id uuid,
  reason text,
  created_by uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_manage_store_inventory(p_store_id) then
    raise exception 'not allowed';
  end if;

  return query
  select
    sm.id,
    sm.created_at,
    rm.name,
    s.name,
    sm.movement_type,
    sm.quantity,
    rm.unit,
    sm.stock_before_quantity,
    sm.stock_after_quantity,
    sm.unit_cost_cents,
    sm.reference_type,
    sm.reference_id,
    coalesce(sm.reason, sm.notes),
    sm.created_by
  from public.stock_movements sm
  join public.raw_materials rm on rm.id = sm.raw_material_id
  left join public.suppliers s on s.id = rm.supplier_id
  where sm.store_id = p_store_id
    and sm.created_at >= p_from
    and sm.created_at < p_to
  order by sm.created_at desc;
end;
$$;

create or replace function public.admin_sales_summary_report(
  p_store_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns table (
  orders_count bigint,
  cancelled_orders_count bigint,
  completed_orders_count bigint,
  gross_sales_cents bigint,
  delivery_fees_cents bigint,
  average_ticket_cents integer,
  estimated_cmv_cents bigint,
  estimated_gross_profit_cents bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_manage_store_inventory(p_store_id) then
    raise exception 'not allowed';
  end if;

  return query
  with order_base as (
    select *
    from public.orders o
    where o.store_id = p_store_id
      and o.created_at >= p_from
      and o.created_at < p_to
  ),
  cmv as (
    select
      coalesce(round(sum(abs(sm.quantity) * coalesce(sm.unit_cost_cents, rm.cost_per_unit_cents)))::bigint, 0) as estimated_cmv_cents
    from public.stock_movements sm
    join public.raw_materials rm on rm.id = sm.raw_material_id
    where sm.store_id = p_store_id
      and sm.created_at >= p_from
      and sm.created_at < p_to
      and sm.movement_type = 'recipe_use'
  ),
  sales as (
    select
      count(*) as orders_count,
      count(*) filter (where status = 'cancelled') as cancelled_orders_count,
      count(*) filter (where status = 'completed') as completed_orders_count,
      coalesce(sum(total_cents) filter (where status <> 'cancelled'), 0)::bigint as gross_sales_cents,
      coalesce(sum(delivery_fee_cents) filter (where status <> 'cancelled'), 0)::bigint as delivery_fees_cents,
      coalesce(round(avg(total_cents) filter (where status <> 'cancelled'))::integer, 0) as average_ticket_cents
    from order_base
  )
  select
    sales.orders_count,
    sales.cancelled_orders_count,
    sales.completed_orders_count,
    sales.gross_sales_cents,
    sales.delivery_fees_cents,
    sales.average_ticket_cents,
    cmv.estimated_cmv_cents,
    sales.gross_sales_cents - cmv.estimated_cmv_cents
  from sales
  cross join cmv;
end;
$$;

create or replace function public.admin_product_sales_report(
  p_store_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns table (
  product_id uuid,
  product_name text,
  quantity_sold bigint,
  gross_sales_cents bigint,
  estimated_cmv_cents bigint,
  estimated_gross_profit_cents bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_manage_store_inventory(p_store_id) then
    raise exception 'not allowed';
  end if;

  return query
  select
    oi.product_id,
    oi.product_name,
    sum(oi.quantity)::bigint as quantity_sold,
    sum(oi.total_cents)::bigint as gross_sales_cents,
    coalesce(round(sum(oi.quantity * public.product_recipe_cost_cents(oi.product_id)))::bigint, 0) as estimated_cmv_cents,
    (sum(oi.total_cents) - coalesce(round(sum(oi.quantity * public.product_recipe_cost_cents(oi.product_id)))::bigint, 0))::bigint as estimated_gross_profit_cents
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to
    and o.status <> 'cancelled'
  group by oi.product_id, oi.product_name
  order by 3 desc, 4 desc;
end;
$$;

create or replace function public.admin_consumed_ingredients_report(
  p_store_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns table (
  raw_material_id uuid,
  material_name text,
  supplier_name text,
  quantity_consumed numeric,
  unit text,
  estimated_cost_cents bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_manage_store_inventory(p_store_id) then
    raise exception 'not allowed';
  end if;

  return query
  select
    rm.id,
    rm.name,
    s.name,
    abs(sum(sm.quantity))::numeric(12,3),
    rm.unit,
    coalesce(round(sum(abs(sm.quantity) * coalesce(sm.unit_cost_cents, rm.cost_per_unit_cents)))::bigint, 0)
  from public.stock_movements sm
  join public.raw_materials rm on rm.id = sm.raw_material_id
  left join public.suppliers s on s.id = rm.supplier_id
  where sm.store_id = p_store_id
    and sm.created_at >= p_from
    and sm.created_at < p_to
    and sm.movement_type = 'recipe_use'
  group by rm.id, rm.name, s.name, rm.unit
  order by 4 desc;
end;
$$;

create or replace function public.admin_payment_methods_report(
  p_store_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns table (
  payment_method public.payment_method,
  orders_count bigint,
  gross_sales_cents bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_manage_store_inventory(p_store_id) then
    raise exception 'not allowed';
  end if;

  return query
  select
    o.payment_method,
    count(*)::bigint,
    coalesce(sum(o.total_cents), 0)::bigint
  from public.orders o
  where o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to
    and o.status <> 'cancelled'
  group by o.payment_method
  order by 3 desc;
end;
$$;

revoke execute on function public.admin_stock_movements_report(uuid, timestamptz, timestamptz) from public;
revoke execute on function public.admin_sales_summary_report(uuid, timestamptz, timestamptz) from public;
revoke execute on function public.admin_product_sales_report(uuid, timestamptz, timestamptz) from public;
revoke execute on function public.admin_consumed_ingredients_report(uuid, timestamptz, timestamptz) from public;
revoke execute on function public.admin_payment_methods_report(uuid, timestamptz, timestamptz) from public;

grant execute on function public.admin_stock_movements_report(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_sales_summary_report(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_product_sales_report(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_consumed_ingredients_report(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_payment_methods_report(uuid, timestamptz, timestamptz) to authenticated;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
)
insert into public.suppliers (store_id, name, notes)
select id, 'Fornecedor não informado', 'Registro padrão para matérias-primas antigas sem fornecedor definido.'
from burgerc
on conflict (store_id, name) do nothing;

update public.raw_materials rm
set supplier_id = s.id,
    purchase_unit = coalesce(rm.purchase_unit, rm.unit),
    recipe_unit = coalesce(rm.recipe_unit, rm.unit)
from public.suppliers s
where s.store_id = rm.store_id
  and s.name = 'Fornecedor não informado'
  and rm.supplier_id is null;
