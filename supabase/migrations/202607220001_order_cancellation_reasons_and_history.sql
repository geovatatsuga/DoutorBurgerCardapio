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

-- 3. RPC to fetch detailed order status timeline with profile/email info
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
