begin;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
desired_products as (
  select *
  from (values
    ('X-Salada', '/assets/products/x-salada-burgerc.png', 10, true),
    ('Cheeseburger', '/assets/products/cheeseburger-burgerc.png', 20, false),
    ('X-Bacon', '/assets/products/x-bacon-burgerc.png', 30, true),
    ('Agridoce', '/assets/products/agridoce-burgerc.png', 40, false),
    ('Duplo', '/assets/products/duplo-burgerc.png', 50, true)
  ) as p(name, image_path, sort_order, is_favorite)
)
update public.products p
set image_path = d.image_path,
    sort_order = d.sort_order,
    is_favorite = d.is_favorite,
    is_active = true,
    updated_at = now()
from burgerc b
join desired_products d on true
where p.store_id = b.id
  and p.name = d.name;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
desired_names as (
  select unnest(array['X-Salada', 'Cheeseburger', 'X-Bacon', 'Agridoce', 'Duplo']) as name
)
update public.products p
set is_active = false,
    updated_at = now()
from burgerc b
where p.store_id = b.id
  and p.name not in (select name from desired_names);

commit;
