begin;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
sales_copy as (
  select *
  from (values
    (
      'X-Salada',
      'Um classico completo com carne suculenta de 90 g, queijo prato derretido e salada fresca no pao brioche dourado. A maionese de ervas fecha o sabor com leveza e deixa cada mordida equilibrada.'
    ),
    (
      'Cheeseburger',
      'Direto ao ponto: blend bovino suculento de 90 g, cheddar bem derretido e maionese da casa no pao brioche. Simples, cremoso e feito para matar a vontade de burger de verdade.'
    ),
    (
      'X-Bacon',
      'Blend bovino de 90 g com cheddar derretido, bacon em tiras crocante e cebola chapeada. A maionese de alho traz aquele sabor marcante que combina com cada camada.'
    ),
    (
      'Agridoce',
      'Uma combinacao diferente e viciante: carne suculenta de 90 g, queijo coalho tostado e abacaxi caramelizado. A maionese de pimenta equilibra o doce, o salgado e uma picancia na medida.'
    ),
    (
      'Duplo',
      'O mais pesado da casa: dois blends bovinos suculentos, duplo cheddar, bacon em cubos e cebola caramelizada no vinho. A maionese defumada com cebolinha deixa o Duplo intenso do inicio ao fim.'
    )
  ) as p(name, description)
)
update public.products p
set description = s.description,
    updated_at = now()
from burgerc b
join sales_copy s on true
where p.store_id = b.id
  and p.name = s.name;

commit;
