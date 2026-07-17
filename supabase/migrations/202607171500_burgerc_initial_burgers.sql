with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
burgers as (
  insert into public.categories (store_id, name, icon, sort_order, is_active)
  select id, 'Burgers', 'burger', 10, true
  from burgerc
  on conflict (store_id, name) do update
  set icon = excluded.icon,
      sort_order = excluded.sort_order,
      is_active = true
  returning id, store_id
),
category_ref as (
  select id, store_id from burgers
  union
  select c.id, c.store_id
  from public.categories c
  join burgerc b on b.id = c.store_id
  where c.name = 'Burgers'
),
desired_products as (
  select *
  from (values
    (
      'X salad',
      'Pao brioche, blend de 90 gramas, queijo prato, alface, tomate, cebola roxa e maionese de ervas.',
      1800,
      '/assets/products/x-salad-burgerc.png',
      10
    ),
    (
      'Cheese burger',
      'Pao brioche, blend de 90 gramas, queijo cheddar e maionese da casa.',
      1600,
      '/assets/products/cheese-burger-burgerc.png',
      20
    ),
    (
      'X bacon',
      'Pao brioche, blend de 90 gramas, queijo cheddar, cebola chapeada, maionese de alho e bacon em tiras.',
      2200,
      '/assets/products/x-bacon-burgerc.png',
      30
    ),
    (
      'Agridoce',
      'Pao brioche, blend de 90 gramas, queijo coalho tostado, abacaxi caramelizado e maionese de pimenta.',
      2500,
      '/assets/products/agridoce-burgerc.png',
      40
    ),
    (
      'Duplo',
      'Pao brioche, duplo blend de 90 gramas, duplo queijo cheddar, cebola caramelizada no vinho, bacon em cubos e maionese defumada com cebolinha picada.',
      3000,
      '/assets/products/duplo-burgerc.png',
      50
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
  p.sort_order in (10, 30, 50),
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
    is_favorite = excluded.is_favorite,
    is_combo = false,
    sort_order = excluded.sort_order;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
desired_names as (
  select unnest(array['X salad', 'Cheese burger', 'X bacon', 'Agridoce', 'Duplo']) as name
)
update public.products p
set is_active = false
from burgerc b
where p.store_id = b.id
  and p.name not in (select name from desired_names)
  and p.is_combo = false;
