-- Replace only the temporary photos of BurgerC's four existing sides.
-- Never overwrite a photo changed through the admin panel.
update public.products p
set image_path = photos.new_path,
    updated_at = now()
from public.stores s,
     (values
       ('Batata Simples', '/assets/new-direction/batata-cheddar-bacon.webp', '/assets/products/batata-simples-wide.webp'),
       ('Batata Cheddar & Bacon', '/assets/new-direction/batata-cheddar-bacon.webp', '/assets/products/batata-cheddar-bacon-wide.webp'),
       ('Onion Rings', '/assets/new-direction/veggie-doctor.webp', '/assets/products/onion-rings-wide.webp'),
       ('Nuggets 6 un', '/assets/new-direction/chicken-crispy.webp', '/assets/products/nuggets-wide.webp')
     ) as photos(product_name, old_path, new_path)
where s.slug = 'burgerc'
  and p.store_id = s.id
  and p.name = photos.product_name
  and p.image_path = photos.old_path;
