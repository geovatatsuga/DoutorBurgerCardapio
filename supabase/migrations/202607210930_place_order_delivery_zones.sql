-- Use delivery_zones when the storefront sends delivery_zone_id inside p_delivery_address.
-- This keeps checkout totals in the database aligned with the area selected by the customer.

create or replace function public.place_order(
  p_store_id uuid,
  p_fulfillment public.fulfillment_type,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address jsonb,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_notes text default null
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
  v_zone_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_notes text;
  v_subtotal integer := 0;
  v_delivery_fee integer := 0;
  v_min_order integer := 0;
  v_order_item_id uuid;
  v_option public.modifier_options%rowtype;
  v_option_id uuid;
begin
  select * into v_store from public.stores where id = p_store_id and is_active;
  if not found then
    raise exception 'store not available';
  end if;

  if p_customer_name is null or length(trim(p_customer_name)) < 3 then
    raise exception 'customer name is required';
  end if;
  if p_customer_phone is null or length(regexp_replace(p_customer_phone, '\D', '', 'g')) < 10 then
    raise exception 'valid phone is required';
  end if;
  if p_fulfillment = 'delivery' and p_delivery_address is null then
    raise exception 'delivery address is required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one item is required';
  end if;

  if p_fulfillment = 'delivery' then
    v_delivery_fee := v_store.delivery_fee_cents;
    v_min_order := v_store.min_order_cents;

    if p_delivery_address ? 'delivery_zone_id' and nullif(p_delivery_address->>'delivery_zone_id', '') is not null then
      v_zone_id := (p_delivery_address->>'delivery_zone_id')::uuid;

      select * into v_zone
      from public.delivery_zones
      where id = v_zone_id
        and store_id = p_store_id
        and is_active;

      if not found then
        raise exception 'delivery area not available';
      end if;

      v_delivery_fee := v_zone.delivery_fee_cents;
      v_min_order := v_zone.min_order_cents;
    end if;
  end if;

  insert into public.orders (
    store_id, user_id, source, fulfillment, customer_name, customer_phone,
    delivery_address, payment_method, subtotal_cents, delivery_fee_cents, total_cents, notes
  )
  values (
    p_store_id, auth.uid(), 'website', p_fulfillment, trim(p_customer_name), trim(p_customer_phone),
    case when p_fulfillment = 'delivery' then p_delivery_address else null end,
    p_payment_method, 0, v_delivery_fee, v_delivery_fee, nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and store_id = p_store_id
      and is_active;
    if not found then
      raise exception 'product unavailable';
    end if;

    v_qty := greatest(1, coalesce((v_item->>'quantity')::integer, 1));
    v_notes := nullif(left(coalesce(v_item->>'notes', ''), 240), '');

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price_cents, total_cents, notes)
    values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price_cents, v_qty * v_product.price_cents, v_notes)
    returning id into v_order_item_id;

    v_subtotal := v_subtotal + (v_qty * v_product.price_cents);

    if jsonb_typeof(v_item->'modifier_option_ids') = 'array' then
      for v_option_id in
        select value::text::uuid from jsonb_array_elements_text(v_item->'modifier_option_ids')
      loop
        select mo.* into v_option
        from public.modifier_options mo
        join public.modifier_groups mg on mg.id = mo.group_id
        join public.product_modifier_groups pmg on pmg.group_id = mg.id
        where mo.id = v_option_id
          and mo.is_active
          and pmg.product_id = v_product.id;
        if found then
          insert into public.order_item_modifiers (order_item_id, modifier_option_id, group_name, option_name, price_cents)
          select v_order_item_id, mo.id, mg.name, mo.name, mo.price_cents
          from public.modifier_options mo
          join public.modifier_groups mg on mg.id = mo.group_id
          where mo.id = v_option.id;

          update public.order_items
          set unit_price_cents = unit_price_cents + v_option.price_cents,
              total_cents = quantity * (unit_price_cents + v_option.price_cents)
          where id = v_order_item_id;
          v_subtotal := v_subtotal + (v_qty * v_option.price_cents);
        end if;
      end loop;
    end if;
  end loop;

  if p_fulfillment = 'delivery' and v_subtotal < v_min_order then
    raise exception 'minimum order not reached';
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

revoke execute on function public.place_order(uuid, public.fulfillment_type, text, text, jsonb, public.payment_method, jsonb, text) from public;
grant execute on function public.place_order(uuid, public.fulfillment_type, text, text, jsonb, public.payment_method, jsonb, text) to anon, authenticated;
