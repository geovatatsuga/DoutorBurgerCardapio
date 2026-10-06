-- Register the add-ons presented by the storefront as database-priced modifiers.
-- This migration only seeds catalog data; it does not change the already-applied initial schema.

with store_row as (
  select id from public.stores where slug = 'burgerc'
), definitions(category_name, group_name, max_select, option_name, price_cents, sort_order) as (
  values
    ('Burgers', 'Adicionais - Burgers', 7, 'Blend de carne extra (90g)', 800, 10),
    ('Burgers', 'Adicionais - Burgers', 7, 'Bacon crocante em tiras', 400, 20),
    ('Burgers', 'Adicionais - Burgers', 7, 'Cheddar derretido extra', 350, 30),
    ('Burgers', 'Adicionais - Burgers', 7, 'Queijo prato extra', 300, 40),
    ('Burgers', 'Adicionais - Burgers', 7, 'Ovo frito', 300, 50),
    ('Burgers', 'Adicionais - Burgers', 7, 'Molho especial da casa', 250, 60),
    ('Burgers', 'Adicionais - Burgers', 7, 'Transformar em Combo (Batata + Bebida)', 1190, 70),
    ('Acompanhamentos', 'Adicionais - Acompanhamentos', 6, 'Molho Especial da Casa', 250, 10),
    ('Acompanhamentos', 'Adicionais - Acompanhamentos', 6, 'Molho de Alho', 250, 20),
    ('Acompanhamentos', 'Adicionais - Acompanhamentos', 6, 'Molho Barbecue', 250, 30),
    ('Acompanhamentos', 'Adicionais - Acompanhamentos', 6, 'Cheddar cremoso por cima', 500, 40),
    ('Acompanhamentos', 'Adicionais - Acompanhamentos', 6, 'Bacon em cubos por cima', 500, 50),
    ('Acompanhamentos', 'Adicionais - Acompanhamentos', 6, 'Porção Grande (G)', 500, 60),
    ('Bebidas', 'Adicionais - Bebidas', 1, 'Gelo e Limão', 0, 10),
    ('Sobremesas', 'Adicionais - Sobremesas', 1, 'Calda Extra de Chocolate', 300, 10),
    ('Combo%', 'Adicionais - Combo - Burger 1', 1, 'Agridoce', 400, 10),
    ('Combo%', 'Adicionais - Combo - Burger 1', 1, 'Duplo', 800, 20),
    ('Combo%', 'Adicionais - Combo - Burger 2', 1, 'Agridoce', 400, 10),
    ('Combo%', 'Adicionais - Combo - Burger 2', 1, 'Duplo', 800, 20),
    ('Combo%', 'Adicionais - Combo - Acompanhamento', 1, 'Onion Rings', 300, 10),
    ('Combo%', 'Adicionais - Combo - Acompanhamento', 1, 'Nuggets 6 un', 300, 20)
), group_rows as (
  insert into public.modifier_groups (store_id, name, min_select, max_select, is_required, sort_order)
  select distinct s.id, d.group_name, 0, d.max_select, false, 900
  from store_row s cross join definitions d
  on conflict (store_id, name) do update
    set max_select = greatest(public.modifier_groups.max_select, excluded.max_select),
        min_select = 0,
        is_required = false,
        updated_at = now()
  returning id, store_id, name
), option_rows as (
  insert into public.modifier_options (group_id, name, price_cents, is_active, sort_order)
  select g.id, d.option_name, d.price_cents, true, d.sort_order
  from group_rows g
  join definitions d on d.group_name = g.name
  on conflict (group_id, name) do update
    set is_active = true,
        sort_order = excluded.sort_order,
        updated_at = now()
  returning group_id
)
insert into public.product_modifier_groups (product_id, group_id, sort_order)
select p.id, g.id, 900
from store_row s
join public.products p on p.store_id = s.id and p.is_active
join public.categories c on c.id = p.category_id and c.store_id = s.id
join public.modifier_groups g on g.store_id = s.id
join (select distinct category_name, group_name from definitions) d
  on c.name ilike d.category_name and d.group_name = g.name
on conflict (product_id, group_id) do nothing;
