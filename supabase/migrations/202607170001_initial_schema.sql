create extension if not exists pgcrypto;

create type public.membership_role as enum ('owner', 'admin', 'manager', 'kitchen', 'cashier');
create type public.order_source as enum ('website', 'ifood', 'manual');
create type public.fulfillment_type as enum ('delivery', 'pickup');
create type public.order_status as enum ('received', 'confirmed', 'preparing', 'ready', 'dispatched', 'completed', 'cancelled');
create type public.payment_method as enum ('pix', 'credit_card', 'debit_card', 'cash', 'ifood');
create type public.payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_phone_len check (phone is null or char_length(phone) between 8 and 24)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  phone text,
  address text,
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  delivery_time_label text not null default '35-45 min',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.store_memberships (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create table public.store_hours (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, day_of_week),
  constraint store_hours_times_required check ((is_open = false) or (opens_at is not null and closes_at is not null))
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  image_path text,
  is_active boolean not null default true,
  is_favorite boolean not null default false,
  is_combo boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, name)
);

create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 0),
  is_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modifier_groups_max_ge_min check (max_select >= min_select),
  unique (store_id, name)
);

create table public.modifier_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.modifier_groups(id) on delete cascade,
  name text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, name)
);

create table public.product_modifier_groups (
  product_id uuid not null references public.products(id) on delete cascade,
  group_id uuid not null references public.modifier_groups(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, group_id)
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null default 'Casa',
  street text not null,
  number text,
  neighborhood text,
  city text not null default 'Joao Pessoa',
  state text not null default 'PB',
  postal_code text,
  complement text,
  reference_point text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_addresses_owner check (user_id = auth.uid())
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  order_number bigint generated always as identity unique,
  source public.order_source not null default 'website',
  fulfillment public.fulfillment_type not null,
  customer_name text not null,
  customer_phone text not null,
  delivery_address jsonb,
  payment_method public.payment_method not null,
  status public.order_status not null default 'received',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_matches check (total_cents = subtotal_cents + delivery_fee_cents),
  constraint orders_delivery_address check ((fulfillment = 'pickup' and delivery_address is null) or (fulfillment = 'delivery' and delivery_address is not null))
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint order_items_total_matches check (total_cents = quantity * unit_price_cents)
);

create table public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  modifier_option_id uuid references public.modifier_options(id) on delete set null,
  group_name text not null,
  option_name text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents >= 0),
  provider text,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  from_status public.order_status,
  to_status public.order_status not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null,
  external_account_id text,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, provider)
);

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null,
  external_event_id text,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  session_id text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index store_memberships_user_idx on public.store_memberships(user_id, is_active);
create index store_hours_store_idx on public.store_hours(store_id);
create index categories_store_active_idx on public.categories(store_id, is_active, sort_order);
create index products_store_active_idx on public.products(store_id, is_active, sort_order);
create index products_category_idx on public.products(category_id);
create index modifier_groups_store_idx on public.modifier_groups(store_id);
create index modifier_options_group_active_idx on public.modifier_options(group_id, is_active);
create index customer_addresses_user_idx on public.customer_addresses(user_id);
create index orders_user_idx on public.orders(user_id, created_at desc);
create index orders_store_status_idx on public.orders(store_id, status, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index order_item_modifiers_item_idx on public.order_item_modifiers(order_item_id);
create index payments_order_idx on public.payments(order_id);
create index order_status_history_order_idx on public.order_status_history(order_id, created_at);
create index integration_accounts_store_idx on public.integration_accounts(store_id);
create index integration_events_store_idx on public.integration_events(store_id, created_at desc);
create index analytics_events_store_created_idx on public.analytics_events(store_id, created_at desc);
create index analytics_events_user_idx on public.analytics_events(user_id);
create index audit_logs_store_created_idx on public.audit_logs(store_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger stores_set_updated_at before update on public.stores for each row execute function public.set_updated_at();
create trigger store_memberships_set_updated_at before update on public.store_memberships for each row execute function public.set_updated_at();
create trigger store_hours_set_updated_at before update on public.store_hours for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger modifier_groups_set_updated_at before update on public.modifier_groups for each row execute function public.set_updated_at();
create trigger modifier_options_set_updated_at before update on public.modifier_options for each row execute function public.set_updated_at();
create trigger customer_addresses_set_updated_at before update on public.customer_addresses for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger integration_accounts_set_updated_at before update on public.integration_accounts for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_store_member(check_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.store_memberships sm
    where sm.store_id = check_store_id
      and sm.user_id = auth.uid()
      and sm.is_active
  );
$$;

create or replace function public.has_store_role(check_store_id uuid, allowed_roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.store_memberships sm
    where sm.store_id = check_store_id
      and sm.user_id = auth.uid()
      and sm.is_active
      and sm.role = any(allowed_roles)
  );
$$;

create or replace function public.can_access_order(check_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = check_order_id
      and (
        o.user_id = auth.uid()
        or public.is_store_member(o.store_id)
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_memberships enable row level security;
alter table public.store_hours enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.modifier_groups enable row level security;
alter table public.modifier_options enable row level security;
alter table public.product_modifier_groups enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_modifiers enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.integration_accounts enable row level security;
alter table public.integration_events enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_own_or_staff on public.profiles for select
  using (id = auth.uid() or exists (select 1 from public.store_memberships sm where sm.user_id = profiles.id and public.is_store_member(sm.store_id)));
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy stores_select_active_or_member on public.stores for select
  using (is_active or public.is_store_member(id));
create policy stores_staff_update on public.stores for update
  using (public.has_store_role(id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(id, array['owner','admin','manager']::public.membership_role[]));

create policy memberships_select_related on public.store_memberships for select
  using (user_id = auth.uid() or public.has_store_role(store_id, array['owner','admin']::public.membership_role[]));
create policy memberships_admin_insert on public.store_memberships for insert
  with check (public.has_store_role(store_id, array['owner','admin']::public.membership_role[]));
create policy memberships_admin_update on public.store_memberships for update
  using (public.has_store_role(store_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin']::public.membership_role[]));

create policy store_hours_public_select on public.store_hours for select
  using (exists (select 1 from public.stores s where s.id = store_hours.store_id and s.is_active) or public.is_store_member(store_id));
create policy store_hours_staff_write on public.store_hours for all
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create policy categories_public_select on public.categories for select
  using ((is_active and exists (select 1 from public.stores s where s.id = categories.store_id and s.is_active)) or public.is_store_member(store_id));
create policy categories_staff_write on public.categories for all
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create policy products_public_select on public.products for select
  using ((is_active and exists (select 1 from public.categories c join public.stores s on s.id = c.store_id where c.id = products.category_id and c.is_active and s.is_active)) or public.is_store_member(store_id));
create policy products_staff_write on public.products for all
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create policy modifier_groups_public_select on public.modifier_groups for select
  using (exists (select 1 from public.stores s where s.id = modifier_groups.store_id and s.is_active) or public.is_store_member(store_id));
create policy modifier_groups_staff_write on public.modifier_groups for all
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create policy modifier_options_public_select on public.modifier_options for select
  using ((is_active and exists (select 1 from public.modifier_groups mg join public.stores s on s.id = mg.store_id where mg.id = modifier_options.group_id and s.is_active)) or exists (select 1 from public.modifier_groups mg where mg.id = modifier_options.group_id and public.is_store_member(mg.store_id)));
create policy modifier_options_staff_write on public.modifier_options for all
  using (exists (select 1 from public.modifier_groups mg where mg.id = modifier_options.group_id and public.has_store_role(mg.store_id, array['owner','admin','manager']::public.membership_role[])))
  with check (exists (select 1 from public.modifier_groups mg where mg.id = modifier_options.group_id and public.has_store_role(mg.store_id, array['owner','admin','manager']::public.membership_role[])));

create policy product_modifier_groups_public_select on public.product_modifier_groups for select
  using (exists (select 1 from public.products p where p.id = product_modifier_groups.product_id and (p.is_active or public.is_store_member(p.store_id))));
create policy product_modifier_groups_staff_write on public.product_modifier_groups for all
  using (exists (select 1 from public.products p where p.id = product_modifier_groups.product_id and public.has_store_role(p.store_id, array['owner','admin','manager']::public.membership_role[])))
  with check (exists (select 1 from public.products p where p.id = product_modifier_groups.product_id and public.has_store_role(p.store_id, array['owner','admin','manager']::public.membership_role[])));

create policy customer_addresses_select_own on public.customer_addresses for select using (user_id = auth.uid());
create policy customer_addresses_insert_own on public.customer_addresses for insert with check (user_id = auth.uid());
create policy customer_addresses_update_own on public.customer_addresses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy customer_addresses_delete_own on public.customer_addresses for delete using (user_id = auth.uid());

create policy orders_select_own_or_staff on public.orders for select
  using (user_id = auth.uid() or public.is_store_member(store_id));
create policy orders_staff_update on public.orders for update
  using (public.has_store_role(store_id, array['owner','admin','manager','kitchen','cashier']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager','kitchen','cashier']::public.membership_role[]));

create policy order_items_select_related on public.order_items for select using (public.can_access_order(order_id));
create policy order_item_modifiers_select_related on public.order_item_modifiers for select
  using (exists (select 1 from public.order_items oi where oi.id = order_item_modifiers.order_item_id and public.can_access_order(oi.order_id)));
create policy payments_select_related on public.payments for select using (public.can_access_order(order_id));
create policy order_status_history_select_related on public.order_status_history for select using (public.can_access_order(order_id));

create policy integration_accounts_admin_select on public.integration_accounts for select
  using (public.has_store_role(store_id, array['owner','admin']::public.membership_role[]));
create policy integration_events_admin_select on public.integration_events for select
  using (public.has_store_role(store_id, array['owner','admin']::public.membership_role[]));

create policy analytics_insert_scoped on public.analytics_events for insert
  with check (user_id is null or user_id = auth.uid());
create policy analytics_admin_select on public.analytics_events for select
  using (store_id is not null and public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

create policy audit_logs_admin_select on public.audit_logs for select
  using (store_id is not null and public.has_store_role(store_id, array['owner','admin']::public.membership_role[]));

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
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_notes text;
  v_subtotal integer := 0;
  v_delivery_fee integer := 0;
  v_order_item_id uuid;
  v_option public.modifier_options%rowtype;
  v_option_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

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

  v_delivery_fee := case when p_fulfillment = 'delivery' then v_store.delivery_fee_cents else 0 end;

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

  if p_fulfillment = 'delivery' and v_subtotal < v_store.min_order_cents then
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

create or replace function public.transition_order_status(
  p_order_id uuid,
  p_new_status public.order_status,
  p_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_old_status public.order_status;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order not found';
  end if;

  if not public.has_store_role(v_order.store_id, array['owner','admin','manager','kitchen','cashier']::public.membership_role[]) then
    raise exception 'not allowed';
  end if;

  v_old_status := v_order.status;
  if v_old_status = p_new_status then
    return v_order;
  end if;

  if not (
    (v_old_status = 'received' and p_new_status in ('confirmed','preparing','cancelled')) or
    (v_old_status = 'confirmed' and p_new_status in ('preparing','cancelled')) or
    (v_old_status = 'preparing' and p_new_status in ('ready','cancelled')) or
    (v_old_status = 'ready' and p_new_status in ('dispatched','completed','cancelled')) or
    (v_old_status = 'dispatched' and p_new_status in ('completed','cancelled'))
  ) then
    raise exception 'invalid status transition';
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id
  returning * into v_order;

  insert into public.order_status_history (order_id, changed_by, from_status, to_status, reason)
  values (p_order_id, auth.uid(), v_old_status, p_new_status, nullif(trim(coalesce(p_reason, '')), ''));

  insert into public.audit_logs (store_id, actor_id, action, entity_table, entity_id, before_data, after_data)
  values (
    v_order.store_id,
    auth.uid(),
    'transition_order_status',
    'orders',
    p_order_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_new_status)
  );

  return v_order;
end;
$$;

revoke execute on function public.place_order(uuid, public.fulfillment_type, text, text, jsonb, public.payment_method, jsonb, text) from public;
revoke execute on function public.transition_order_status(uuid, public.order_status, text) from public;
grant execute on function public.place_order(uuid, public.fulfillment_type, text, text, jsonb, public.payment_method, jsonb, text) to authenticated;
grant execute on function public.transition_order_status(uuid, public.order_status, text) to authenticated;

insert into public.stores (id, slug, name, phone, address, min_order_cents, delivery_fee_cents, delivery_time_label)
values ('11111111-1111-4111-8111-111111111111', 'doutor-burger', 'Doutor Burger', '(83) 98765-4321', 'Rua Clotilde Torres, 116-B, Casa - Alto do Mateus, Joao Pessoa - PB, CEP 58090-240', 2000, 690, '35-45 min')
on conflict (id) do nothing;

insert into public.store_hours (store_id, day_of_week, opens_at, closes_at, is_open)
select '11111111-1111-4111-8111-111111111111', d, '18:00'::time, '23:30'::time, d <> 1
from generate_series(0, 6) as d
on conflict (store_id, day_of_week) do nothing;

insert into public.categories (id, store_id, name, icon, sort_order) values
('21111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Burgers', 'burger', 10),
('21111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', 'Combos', 'combo', 20),
('21111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111111', 'Batatas', 'fries', 30),
('21111111-1111-4111-8111-111111111114', '11111111-1111-4111-8111-111111111111', 'Bebidas', 'drink', 40),
('21111111-1111-4111-8111-111111111115', '11111111-1111-4111-8111-111111111111', 'Sobremesas', 'cake', 50)
on conflict (id) do nothing;

insert into public.products (id, store_id, category_id, name, description, price_cents, image_path, is_favorite, is_combo, sort_order) values
('31111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '21111111-1111-4111-8111-111111111111', 'Doutor Burger', 'Pao brioche, blend 180g, cheddar, bacon, alface, tomate e molho especial.', 3490, '/assets/new-direction/doutor-burger.webp', true, false, 10),
('31111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', '21111111-1111-4111-8111-111111111111', 'Smash Cheddar', 'Dois smash burgers, cheddar cremoso, picles e cebola.', 2890, '/assets/new-direction/smash-cheddar.webp', true, false, 20),
('31111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111111', '21111111-1111-4111-8111-111111111112', 'Combo Doutor', 'Doutor Burger, batata crocante e refrigerante gelado.', 4990, '/assets/new-direction/chicken-crispy.webp', true, true, 30)
on conflict (id) do nothing;

insert into public.modifier_groups (id, store_id, name, min_select, max_select, is_required, sort_order) values
('41111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Extras', 0, 6, false, 10),
('41111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', 'Ponto da carne', 0, 1, false, 20),
('41111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111111', 'Combo', 0, 1, false, 30)
on conflict (id) do nothing;

insert into public.modifier_options (id, group_id, name, price_cents, sort_order) values
('51111111-1111-4111-8111-111111111111', '41111111-1111-4111-8111-111111111111', 'Bacon extra', 390, 10),
('51111111-1111-4111-8111-111111111112', '41111111-1111-4111-8111-111111111111', 'Cheddar extra', 290, 20),
('51111111-1111-4111-8111-111111111113', '41111111-1111-4111-8111-111111111111', 'Molho especial', 190, 30),
('51111111-1111-4111-8111-111111111114', '41111111-1111-4111-8111-111111111112', 'Ao ponto', 0, 10),
('51111111-1111-4111-8111-111111111115', '41111111-1111-4111-8111-111111111112', 'Bem passado', 0, 20),
('51111111-1111-4111-8111-111111111116', '41111111-1111-4111-8111-111111111113', 'Adicionar batata + bebida', 1190, 10)
on conflict (id) do nothing;

insert into public.product_modifier_groups (product_id, group_id, sort_order)
select p.id, g.id, g.sort_order
from public.products p
cross join public.modifier_groups g
where p.store_id = '11111111-1111-4111-8111-111111111111'
  and g.store_id = p.store_id
on conflict do nothing;
