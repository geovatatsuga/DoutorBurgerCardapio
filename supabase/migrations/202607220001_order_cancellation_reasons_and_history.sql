-- Migration 202607220001: Order Cancellation Reasons, Status Timeline RPC, and Supabase Storage Bucket setup

-- 1. Create storage buckets ('Images' and 'product-images') if they don't exist
insert into storage.buckets (id, name, public)
values ('Images', 'Images', true), ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Storage policies for Images bucket
drop policy if exists "Images bucket public select" on storage.objects;
create policy "Images bucket public select"
  on storage.objects for select
  using (bucket_id = 'Images');

drop policy if exists "Images bucket public insert" on storage.objects;
create policy "Images bucket public insert"
  on storage.objects for insert
  with check (bucket_id = 'Images');

drop policy if exists "Images bucket public update" on storage.objects;
create policy "Images bucket public update"
  on storage.objects for update
  using (bucket_id = 'Images');

-- Storage policies for product-images bucket
drop policy if exists "Product images public select" on storage.objects;
create policy "Product images public select"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Product images public insert" on storage.objects;
create policy "Product images public insert"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

drop policy if exists "Product images public update" on storage.objects;
create policy "Product images public update"
  on storage.objects for update
  using (bucket_id = 'product-images');

-- 2. Indexes for fast order status history lookup and sorting
create index if not exists idx_order_status_history_order_id on public.order_status_history (order_id, created_at desc);
create index if not exists idx_orders_store_created on public.orders (store_id, created_at desc);
create index if not exists idx_orders_status on public.orders (store_id, status);

-- 4. Create default Store Admin User ('admin@doutorburger.com' / 'DoutorBurger2026!')
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_store_id uuid;
  v_encrypted_pw text;
begin
  select id into v_store_id from public.stores where slug = 'burgerc' limit 1;
  if v_store_id is null then
    return;
  end if;
  
  v_encrypted_pw := crypt('DoutorBurger2026!', gen_salt('bf'));

  if not exists (select 1 from auth.users where email = 'admin@doutorburger.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      'admin@doutorburger.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Gerente Doutor Burger"}', now(), now()
    );
  else
    select id into v_user_id from auth.users where email = 'admin@doutorburger.com';
    update auth.users set encrypted_password = v_encrypted_pw, email_confirmed_at = now() where id = v_user_id;
  end if;

  insert into public.store_memberships (store_id, user_id, role, is_active)
  values (v_store_id, v_user_id, 'owner', true)
  on conflict (store_id, user_id) do update set role = 'owner', is_active = true;

end $$;
create or replace function public.get_order_status_timeline(p_order_id uuid)
returns table (
  id uuid,
  order_id uuid,
  from_status public.order_status,
  to_status public.order_status,
  reason text,
  changed_by uuid,
  changed_by_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_store_id uuid;
begin
  select store_id into v_store_id from public.orders where public.orders.id = p_order_id;
  if v_store_id is null then
    raise exception 'order not found';
  end if;

  if not public.is_store_member(v_store_id) then
    raise exception 'not allowed';
  end if;

  return query
  select
    h.id,
    h.order_id,
    h.from_status,
    h.to_status,
    h.reason,
    h.changed_by,
    coalesce(nullif(trim(p.full_name), ''), u.email, 'Sistema')::text as changed_by_name,
    h.created_at
  from public.order_status_history h
  left join public.profiles p on p.id = h.changed_by
  left join auth.users u on u.id = h.changed_by
  where h.order_id = p_order_id
  order by h.created_at asc;
end;
$$;

revoke execute on function public.get_order_status_timeline(uuid) from public;
grant execute on function public.get_order_status_timeline(uuid) to authenticated;
