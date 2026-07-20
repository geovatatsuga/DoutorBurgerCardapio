begin;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
drink_order as (
  select *
  from (values
    ('Coca-Cola 350 ml', 410),
    ('Coca-Cola Zero 350 ml', 420),
    ('Guarana Antarctica 350 ml', 430),
    ('Guarana Antarctica Zero 350 ml', 440),
    ('Sprite 350 ml', 450),
    ('Sprite Zero 350 ml', 460)
  ) as p(name, sort_order)
)
update public.products p
set sort_order = d.sort_order,
    updated_at = now()
from burgerc b
join drink_order d on true
where p.store_id = b.id
  and p.name = d.name;

commit;
