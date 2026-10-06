-- Route anonymous checkout through the place-order Edge Function.
-- The function applies an IP quota; this migration also enforces hard payload
-- limits in Postgres so changing the browser cannot bypass quantity validation.

create table if not exists public.order_rate_limits (
  store_id uuid not null references public.stores(id) on delete cascade,
  client_hash text not null check (client_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (store_id, client_hash, window_start)
);

create index if not exists order_rate_limits_window_idx
  on public.order_rate_limits (window_start);

alter table public.orders add column if not exists request_key uuid;
create unique index if not exists orders_store_request_key_uidx
  on public.orders (store_id, request_key)
  where request_key is not null;

alter table public.order_rate_limits enable row level security;
revoke all on public.order_rate_limits from public, anon, authenticated;
grant all on public.order_rate_limits to service_role;

create or replace function public.consume_public_order_quota(
  p_store_id uuid,
  p_client_hash text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_window_start timestamptz;
  v_request_count integer;
begin
  if p_client_hash is null or p_client_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid client identifier';
  end if;

  v_window_start := date_trunc('hour', now())
    + floor(extract(minute from now()) / 15) * interval '15 minutes';

  insert into public.order_rate_limits (store_id, client_hash, window_start, request_count)
  values (p_store_id, p_client_hash, v_window_start, 1)
  on conflict (store_id, client_hash, window_start) do update
    set request_count = public.order_rate_limits.request_count + 1
    where public.order_rate_limits.request_count < 8
  returning request_count into v_request_count;

  delete from public.order_rate_limits
  where window_start < date_trunc('day', now()) - interval '1 day';

  return v_request_count is not null;
end;
$$;

revoke all on function public.consume_public_order_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_public_order_quota(uuid, text) to service_role;

create or replace function public.place_order(
  p_store_id uuid,
  p_fulfillment public.fulfillment_type,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address jsonb,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_notes text,
  p_request_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_store public.stores%rowtype;
  v_zone public.delivery_zones%rowtype;
  v_group record;
  v_zone_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_notes text;
  v_subtotal bigint := 0;
  v_delivery_fee integer := 0;
  v_min_order integer := 0;
  v_order_item_id uuid;
  v_option public.modifier_options%rowtype;
  v_option_id uuid;
  v_option_ids uuid[];
  v_valid_options integer;
  v_group_options integer;
  v_unit_price bigint;
  v_total_quantity integer := 0;
begin
  if p_request_key is null then
    raise exception 'request key is required';
  end if;
  select * into v_store from public.stores where id = p_store_id and is_active;
  if not found then
    raise exception 'store not available';
  end if;

  if p_customer_name is null or length(trim(p_customer_name)) not between 3 and 100 then
    raise exception 'customer name must contain 3 to 100 characters';
  end if;
  if p_customer_phone is null or length(p_customer_phone) > 40
     or length(regexp_replace(p_customer_phone, '\D', '', 'g')) not between 10 and 15 then
    raise exception 'valid phone is required';
  end if;
  if p_fulfillment = 'delivery' and p_delivery_address is null then
    raise exception 'delivery address is required';
  end if;
  if p_fulfillment = 'delivery'
     and length(trim(coalesce(p_delivery_address->>'street', p_delivery_address->>'address', ''))) not between 5 and 300 then
    raise exception 'valid delivery street is required';
  end if;
  if p_delivery_address is not null and octet_length(p_delivery_address::text) > 4096 then
    raise exception 'delivery address is too large';
  end if;
  if p_notes is not null and length(p_notes) > 500 then
    raise exception 'order notes are too long';
  end if;
  if p_payment_method not in ('pix', 'credit_card', 'debit_card', 'cash') then
    raise exception 'unsupported payment method';
  end if;
  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'order must contain 1 to 20 items';
  end if;

  if p_fulfillment = 'delivery' then
    v_delivery_fee := v_store.delivery_fee_cents;
    v_min_order := v_store.min_order_cents;

    if p_delivery_address ? 'delivery_zone_id'
       and nullif(p_delivery_address->>'delivery_zone_id', '') is not null then
      v_zone_id := (p_delivery_address->>'delivery_zone_id')::uuid;
      select * into v_zone
      from public.delivery_zones
      where id = v_zone_id and store_id = p_store_id and is_active;
      if not found then
        raise exception 'delivery area not available';
      end if;
      v_delivery_fee := v_zone.delivery_fee_cents;
      v_min_order := v_zone.min_order_cents;
    elsif exists (select 1 from public.delivery_zones where store_id = p_store_id and is_active) then
      raise exception 'delivery area is required';
    end if;
  end if;

  insert into public.orders (
    store_id, user_id, source, fulfillment, customer_name, customer_phone,
    delivery_address, payment_method, subtotal_cents, delivery_fee_cents, total_cents, notes, request_key
  ) values (
    p_store_id, auth.uid(), 'website', p_fulfillment, trim(p_customer_name), trim(p_customer_phone),
    case when p_fulfillment = 'delivery' then p_delivery_address else null end,
    p_payment_method, 0, v_delivery_fee, v_delivery_fee, nullif(trim(coalesce(p_notes, '')), ''), p_request_key
  ) on conflict (store_id, request_key) where request_key is not null do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select id into v_order_id from public.orders
    where store_id = p_store_id and request_key = p_request_key;
    return v_order_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(v_item->>'quantity', '') !~ '^[0-9]{1,2}$' then
      raise exception 'invalid order item';
    end if;

    v_qty := (v_item->>'quantity')::integer;
    if v_qty not between 1 and 20 then
      raise exception 'item quantity must be between 1 and 20';
    end if;
    v_total_quantity := v_total_quantity + v_qty;
    if v_total_quantity > 40 then
      raise exception 'order quantity exceeds allowed limit';
    end if;
    if length(coalesce(v_item->>'notes', '')) > 240 then
      raise exception 'item notes are too long';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and store_id = p_store_id and is_active;
    if not found then
      raise exception 'product unavailable';
    end if;
    if v_product.price_cents::bigint * v_qty > 2147483647 then
      raise exception 'item total exceeds supported limit';
    end if;

    if v_item ? 'modifier_option_ids' and jsonb_typeof(v_item->'modifier_option_ids') <> 'array' then
      raise exception 'invalid modifiers';
    end if;
    if jsonb_array_length(coalesce(v_item->'modifier_option_ids', '[]'::jsonb)) > 12 then
      raise exception 'too many modifiers';
    end if;

    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_option_ids
    from jsonb_array_elements_text(coalesce(v_item->'modifier_option_ids', '[]'::jsonb));
    if cardinality(v_option_ids) <> (select count(distinct option_id) from unnest(v_option_ids) as option_id) then
      raise exception 'duplicate modifier';
    end if;

    select count(*) into v_valid_options
    from public.modifier_options mo
    join public.product_modifier_groups pmg on pmg.group_id = mo.group_id
    where mo.id = any(v_option_ids) and mo.is_active and pmg.product_id = v_product.id;
    if v_valid_options <> cardinality(v_option_ids) then
      raise exception 'modifier unavailable for product';
    end if;

    for v_group in
      select mg.id, mg.min_select, mg.max_select
      from public.product_modifier_groups pmg
      join public.modifier_groups mg on mg.id = pmg.group_id
      where pmg.product_id = v_product.id
    loop
      select count(*) into v_group_options
      from public.modifier_options mo
      where mo.id = any(v_option_ids) and mo.group_id = v_group.id;
      if v_group_options < v_group.min_select or v_group_options > v_group.max_select then
        raise exception 'modifier selection count is invalid';
      end if;
    end loop;

    v_notes := nullif(left(coalesce(v_item->>'notes', ''), 240), '');
    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price_cents, total_cents, notes)
    values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price_cents, v_qty * v_product.price_cents, v_notes)
    returning id into v_order_item_id;
    v_unit_price := v_product.price_cents;
    v_subtotal := v_subtotal + (v_qty::bigint * v_product.price_cents);

    foreach v_option_id in array v_option_ids loop
      select mo.* into v_option
      from public.modifier_options mo
      where mo.id = v_option_id and mo.is_active;
      if not found then
        raise exception 'modifier unavailable';
      end if;
      if (v_unit_price + v_option.price_cents) * v_qty > 2147483647 then
        raise exception 'item price exceeds supported limit';
      end if;

      insert into public.order_item_modifiers (order_item_id, modifier_option_id, group_name, option_name, price_cents)
      select v_order_item_id, mo.id, mg.name, mo.name, mo.price_cents
      from public.modifier_options mo
      join public.modifier_groups mg on mg.id = mo.group_id
      where mo.id = v_option_id;

      update public.order_items
      set unit_price_cents = v_unit_price + v_option.price_cents,
          total_cents = quantity * (v_unit_price + v_option.price_cents)
      where id = v_order_item_id;
      v_unit_price := v_unit_price + v_option.price_cents;
      v_subtotal := v_subtotal + (v_qty::bigint * v_option.price_cents);
    end loop;

    if v_subtotal > 2147483647 then
      raise exception 'order total exceeds supported limit';
    end if;
  end loop;

  if p_fulfillment = 'delivery' and v_subtotal < v_min_order then
    raise exception 'minimum order not reached';
  end if;
  if v_subtotal + v_delivery_fee > 2147483647 then
    raise exception 'order total exceeds supported limit';
  end if;

  update public.orders
  set subtotal_cents = v_subtotal,
      total_cents = v_subtotal + v_delivery_fee
  where id = v_order_id;

  insert into public.payments (order_id, method, status, amount_cents)
  values (v_order_id, p_payment_method, 'pending', v_subtotal + v_delivery_fee);
  insert into public.order_status_history (order_id, changed_by, from_status, to_status, reason)
  values (v_order_id, auth.uid(), null, 'received', 'order created');

  return v_order_id;
end;
$$;

revoke all on function public.place_order(uuid, public.fulfillment_type, text, text, jsonb, public.payment_method, jsonb, text, uuid)
  from public, anon, authenticated;
grant execute on function public.place_order(uuid, public.fulfillment_type, text, text, jsonb, public.payment_method, jsonb, text, uuid)
  to service_role;
