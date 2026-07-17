begin;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
renames as (
  select *
  from (values
    ('X salad', 'X-Salada'),
    ('Cheese burger', 'Cheeseburger'),
    ('X bacon', 'X-Bacon')
  ) as r(old_name, new_name)
),
renamed as (
  update public.products p
  set name = r.new_name
  from burgerc b
  join renames r on true
  where p.store_id = b.id
    and p.name = r.old_name
    and not exists (
      select 1
      from public.products existing
      where existing.store_id = p.store_id
        and existing.name = r.new_name
    )
  returning p.id
),
desired_products as (
  select *
  from (values
    (
      'X-Salada',
      'Classico completo, fresco e equilibrado. Pao brioche dourado, maionese de ervas em camada discreta, aneis finos de cebola roxa, alface fresca e crocante, 2 rodelas de tomate, 1 fatia de queijo prato levemente derretido e 1 blend bovino artesanal de 90 g.',
      1800,
      '/assets/products/x-salada-burgerc.png',
      10,
      true
    ),
    (
      'Cheeseburger',
      'Simples, robusto e com foco total em carne, queijo e molho. Pao brioche dourado, maionese cremosa da casa, 1 fatia generosa de queijo cheddar derretido e 1 blend bovino artesanal de 90 g com marcas de grelha.',
      1600,
      '/assets/products/cheeseburger-burgerc.png',
      20,
      false
    ),
    (
      'X-Bacon',
      'Cheddar, cebola na chapa e bacon crocante em uma montagem intensa. Pao brioche dourado, maionese cremosa de alho, 3 tiras crocantes de bacon, cebola dourada preparada na chapa, cheddar derretido e 1 blend bovino artesanal de 90 g.',
      2200,
      '/assets/products/x-bacon-burgerc.png',
      30,
      true
    ),
    (
      'Agridoce',
      'Contraste tropical entre queijo coalho tostado e abacaxi caramelizado. Pao brioche dourado, maionese cremosa de pimenta em pequena quantidade, fatias de abacaxi caramelizadas, queijo coalho tostado com marcas de chapa e 1 blend bovino artesanal de 90 g.',
      2500,
      '/assets/products/agridoce-burgerc.png',
      40,
      false
    ),
    (
      'Duplo',
      'Montagem alta e robusta, com 180 g de carne e camadas bem definidas. Pao brioche dourado, maionese defumada com cebolinha, cebola caramelizada no vinho, bacon crocante em cubos, 2 fatias de cheddar derretidas e 2 blends bovinos artesanais de 90 g cada.',
      3000,
      '/assets/products/duplo-burgerc.png',
      50,
      true
    )
  ) as p(name, description, price_cents, image_path, sort_order, is_favorite)
)
update public.products p
set description = d.description,
    price_cents = d.price_cents,
    image_path = d.image_path,
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
  and p.name not in (select name from desired_names)
  and p.is_combo = false;

commit;
