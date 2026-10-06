-- Connect order flow to inventory.
-- When a staff member starts preparing an order, the database consumes the
-- ingredients defined in each product recipe exactly once.

alter table public.orders
  add column if not exists stock_consumed_at timestamptz,
  add column if not exists stock_consumed_by uuid references auth.users(id) on delete set null;

create unique index if not exists stock_movements_order_recipe_once_idx
  on public.stock_movements(reference_id, raw_material_id)
  where reference_type = 'order' and movement_type = 'recipe_use';

create or replace function public.consume_stock_for_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_shortage record;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.has_store_role(
    v_order.store_id,
    array['owner','admin','manager','kitchen','cashier']::public.membership_role[]
  ) then
    raise exception 'not allowed';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'cancelled orders cannot consume stock';
  end if;

  if v_order.stock_consumed_at is not null then
    return v_order;
  end if;

  with required_materials as (
    select
      rm.id as raw_material_id,
      rm.name,
      rm.stock_quantity,
      rm.unit,
      rm.cost_per_unit_cents,
      sum(oi.quantity * pri.quantity * (1 + pri.waste_percent / 100.0))::numeric(12,3) as required_quantity
    from public.order_items oi
    join public.product_recipe_items pri on pri.product_id = oi.product_id
    join public.raw_materials rm on rm.id = pri.raw_material_id
    where oi.order_id = p_order_id
      and rm.store_id = v_order.store_id
      and rm.is_active
    group by rm.id, rm.name, rm.stock_quantity, rm.unit, rm.cost_per_unit_cents
  )
  select *
  into v_shortage
  from required_materials
  where stock_quantity < required_quantity
  order by name
  limit 1;

  if found then
    raise exception 'estoque insuficiente para %: precisa de % %, disponivel % %',
      v_shortage.name,
      v_shortage.required_quantity,
      v_shortage.unit,
      v_shortage.stock_quantity,
      v_shortage.unit;
  end if;

  with required_materials as (
    select
      rm.id as raw_material_id,
      rm.cost_per_unit_cents,
      sum(oi.quantity * pri.quantity * (1 + pri.waste_percent / 100.0))::numeric(12,3) as required_quantity
    from public.order_items oi
    join public.product_recipe_items pri on pri.product_id = oi.product_id
    join public.raw_materials rm on rm.id = pri.raw_material_id
    where oi.order_id = p_order_id
      and rm.store_id = v_order.store_id
      and rm.is_active
    group by rm.id, rm.cost_per_unit_cents
  ),
  movement_rows as (
    insert into public.stock_movements (
      store_id,
      raw_material_id,
      movement_type,
      quantity,
      unit_cost_cents,
      reference_type,
      reference_id,
      notes,
      created_by
    )
    select
      v_order.store_id,
      raw_material_id,
      'recipe_use',
      required_quantity * -1,
      cost_per_unit_cents,
      'order',
      p_order_id,
      'Baixa automática por pedido',
      auth.uid()
    from required_materials
    on conflict do nothing
    returning raw_material_id, quantity
  )
  update public.raw_materials rm
  set stock_quantity = rm.stock_quantity + mr.quantity
  from movement_rows mr
  where rm.id = mr.raw_material_id;

  update public.orders
  set stock_consumed_at = now(),
      stock_consumed_by = auth.uid()
  where id = p_order_id
  returning * into v_order;

  insert into public.audit_logs (store_id, actor_id, action, entity_table, entity_id, after_data)
  values (
    v_order.store_id,
    auth.uid(),
    'consume_stock_for_order',
    'orders',
    p_order_id,
    jsonb_build_object('stock_consumed_at', v_order.stock_consumed_at)
  );

  return v_order;
end;
$$;

revoke execute on function public.consume_stock_for_order(uuid) from public;
grant execute on function public.consume_stock_for_order(uuid) to authenticated;

create or replace function public.consume_stock_when_order_starts_preparing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'preparing'
     and old.status is distinct from new.status
     and new.stock_consumed_at is null then
    perform public.consume_stock_for_order(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists orders_consume_stock_on_preparing on public.orders;
create trigger orders_consume_stock_on_preparing
after update of status on public.orders
for each row
execute function public.consume_stock_when_order_starts_preparing();
