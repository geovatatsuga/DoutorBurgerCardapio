-- Keep the P/G products and their historical order references. Remove the
-- obsolete rustic side and duplicate unsized products from the active menu.
update public.products p
set is_active = false,
    updated_at = now()
from public.stores s
where p.store_id = s.id
  and s.slug = 'burgerc'
  and p.name in (
    'Batata Rústica',
    'Batata Simples',
    'Batata Cheddar & Bacon',
    'Onion Rings',
    'Nuggets 6 un'
  )
  and p.is_active;

-- Replace only the original placeholder photos of the purchasable sizes.
update public.products p
set image_path = photos.new_path,
    updated_at = now()
from public.stores s,
     (values
       ('Batata Simples P', '/assets/products/batata-cheddar-bacon-burgerc.webp', '/assets/products/batata-simples-wide.webp'),
       ('Batata Simples G', '/assets/products/batata-cheddar-bacon-burgerc.webp', '/assets/products/batata-simples-wide.webp'),
       ('Batata Cheddar & Bacon P', '/assets/products/batata-cheddar-bacon-burgerc.webp', '/assets/products/batata-cheddar-bacon-wide.webp'),
       ('Batata Cheddar & Bacon G', '/assets/products/batata-cheddar-bacon-burgerc.webp', '/assets/products/batata-cheddar-bacon-wide.webp'),
       ('Onion Rings P', '/assets/products/batata-cheddar-bacon-burgerc.webp', '/assets/products/onion-rings-wide.webp'),
       ('Onion Rings G', '/assets/products/batata-cheddar-bacon-burgerc.webp', '/assets/products/onion-rings-wide.webp'),
       ('Nuggets P', '/assets/products/chicken-crispy-burgerc.webp', '/assets/products/nuggets-wide.webp'),
       ('Nuggets G', '/assets/products/chicken-crispy-burgerc.webp', '/assets/products/nuggets-wide.webp')
     ) as photos(product_name, old_path, new_path)
where p.store_id = s.id
  and s.slug = 'burgerc'
  and p.name = photos.product_name
  and p.image_path = photos.old_path;
