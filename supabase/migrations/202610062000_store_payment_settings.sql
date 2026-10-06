-- The public storefront must never trust a browser-provided Pix key.
create table public.store_payment_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  pix_key text not null check (length(pix_key) between 5 and 77),
  pix_merchant_name text not null check (length(trim(pix_merchant_name)) between 2 and 25),
  pix_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger store_payment_settings_set_updated_at
  before update on public.store_payment_settings
  for each row execute function public.set_updated_at();

alter table public.store_payment_settings enable row level security;
create policy store_payment_settings_owner_select on public.store_payment_settings for select
  using (public.has_store_role(store_id, array['owner','admin']::public.membership_role[]));
create policy store_payment_settings_owner_insert on public.store_payment_settings for insert
  with check (public.has_store_role(store_id, array['owner','admin']::public.membership_role[]));
create policy store_payment_settings_owner_update on public.store_payment_settings for update
  using (public.has_store_role(store_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin']::public.membership_role[]));

revoke all on public.store_payment_settings from public, anon, authenticated;
grant select, insert, update on public.store_payment_settings to authenticated;
grant all on public.store_payment_settings to service_role;
