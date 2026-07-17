begin;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
optimized_images as (
  select *
  from (values
    ('X-Salada', '/assets/products/x-salada-burgerc.webp'),
    ('Cheeseburger', '/assets/products/cheeseburger-burgerc.webp'),
    ('X-Bacon', '/assets/products/x-bacon-burgerc.webp'),
    ('Agridoce', '/assets/products/agridoce-burgerc.webp'),
    ('Duplo', '/assets/products/duplo-burgerc.webp')
  ) as p(name, image_path)
)
update public.products p
set image_path = i.image_path,
    updated_at = now()
from burgerc b
join optimized_images i on true
where p.store_id = b.id
  and p.name = i.name;

commit;
