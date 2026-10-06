-- Secure public menu-image buckets without changing previously applied migrations.
--
-- Public reads remain enabled so the storefront can display menu images.
-- Writes require an authenticated owner/admin/manager and a store-scoped path:
--   <store UUID>/<filename>
--
-- IMPORTANT: src/services/supabaseData.js currently uploads flat filenames
-- (prod_*.webp). Those uploads will be denied after this migration is applied.
-- Update the application to upload under `${STORE_ID}/${fileName}` before
-- applying this migration. Existing flat-path files remain publicly readable.

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
