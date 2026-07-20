begin;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
beverages as (
  insert into public.categories (store_id, name, icon, sort_order, is_active)
  select id, 'Bebidas', 'drink', 40, true
  from burgerc
  on conflict (store_id, name) do update
  set icon = excluded.icon,
      sort_order = excluded.sort_order,
      is_active = true
  returning id, store_id
),
category_ref as (
  select id, store_id from beverages
  union
  select c.id, c.store_id
  from public.categories c
  join burgerc b on b.id = c.store_id
  where c.name = 'Bebidas'
),
desired_products as (
  select *
  from (values
    (
      'Coca-Cola 350 ml',
      'Refrigerante Coca-Cola lata 350 ml bem gelado.',
      600,
      '/assets/products/coca-cola-350ml-burgerc.webp',
      10
    ),
    (
      'Coca-Cola Zero 350 ml',
      'Refrigerante Coca-Cola Zero lata 350 ml bem gelado.',
      600,
      '/assets/products/coca-cola-zero-350ml-burgerc.webp',
      20
    ),
    (
      'Guarana Antarctica 350 ml',
      'Refrigerante Guarana Antarctica lata 350 ml bem gelado.',
      600,
      '/assets/products/guarana-antarctica-350ml-burgerc.webp',
      30
    ),
    (
      'Guarana Antarctica Zero 350 ml',
      'Refrigerante Guarana Antarctica Zero lata 350 ml bem gelado.',
      600,
      '/assets/products/guarana-antarctica-zero-350ml-burgerc.webp',
      40
    ),
    (
      'Sprite 350 ml',
      'Refrigerante Sprite lata 350 ml bem gelado.',
      600,
      '/assets/products/sprite-350ml-burgerc.webp',
      50
    ),
    (
      'Sprite Zero 350 ml',
      'Refrigerante Sprite Zero lata 350 ml bem gelado.',
      600,
      '/assets/products/sprite-zero-350ml-burgerc.webp',
      60
    )
  ) as p(name, description, price_cents, image_path, sort_order)
)
insert into public.products (
  store_id,
  category_id,
  name,
  description,
  price_cents,
  image_path,
  is_active,
  is_favorite,
  is_combo,
  sort_order
)
select
  cr.store_id,
  cr.id,
  p.name,
  p.description,
  p.price_cents,
  p.image_path,
  true,
  false,
  false,
  p.sort_order
from category_ref cr
cross join desired_products p
on conflict (store_id, name) do update
set category_id = excluded.category_id,
    description = excluded.description,
    price_cents = excluded.price_cents,
    image_path = excluded.image_path,
    is_active = true,
    is_favorite = false,
    is_combo = false,
    sort_order = excluded.sort_order,
    updated_at = now();

commit;
