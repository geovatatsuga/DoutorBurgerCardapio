-- Secure public menu-image buckets without changing previously applied migrations.
--
-- Public reads remain enabled so the storefront can display menu images.
-- Writes require an authenticated owner/admin/manager and a store-scoped path:
--   <store UUID>/<filename>
--
-- Keep authenticated staff uploads with legacy flat prod_*.webp names working
-- during the frontend rollout. New uploads use <store UUID>/<filename>.

drop policy if exists "Images bucket public select" on storage.objects;
drop policy if exists "Images bucket public insert" on storage.objects;
drop policy if exists "Images bucket public update" on storage.objects;
drop policy if exists "Images bucket public delete" on storage.objects;
drop policy if exists "Product images public select" on storage.objects;
drop policy if exists "Product images public insert" on storage.objects;
drop policy if exists "Product images public update" on storage.objects;
drop policy if exists "Product images public delete" on storage.objects;
drop policy if exists "Menu images public read" on storage.objects;
drop policy if exists "Menu images staff insert scoped to store" on storage.objects;
drop policy if exists "Menu images staff update scoped to store" on storage.objects;
drop policy if exists "Menu images staff delete scoped to store" on storage.objects;

create policy "Menu images public read"
  on storage.objects for select
  to public
  using (bucket_id in ('Images', 'product-images'));

create policy "Menu images staff insert scoped to store"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('Images', 'product-images')
    and (
      (name ~ '^prod_[0-9]+_[a-z0-9]+\.webp$'
       and public.has_store_role(
         (select id from public.stores where slug = 'burgerc'),
         array['owner', 'admin', 'manager']::public.membership_role[]
       ))
      or exists (
      select 1
      from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and public.has_store_role(
          s.id,
          array['owner', 'admin', 'manager']::public.membership_role[]
        )
      )
    )
  );

create policy "Menu images staff update scoped to store"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('Images', 'product-images')
    and exists (
      select 1
      from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and public.has_store_role(
          s.id,
          array['owner', 'admin', 'manager']::public.membership_role[]
        )
    )
  )
  with check (
    bucket_id in ('Images', 'product-images')
    and exists (
      select 1
      from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and public.has_store_role(
          s.id,
          array['owner', 'admin', 'manager']::public.membership_role[]
        )
    )
  );

create policy "Menu images staff delete scoped to store"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('Images', 'product-images')
    and exists (
      select 1
      from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and public.has_store_role(
          s.id,
          array['owner', 'admin', 'manager']::public.membership_role[]
        )
    )
  );
