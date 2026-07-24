-- Migration to normalize side products and option groups in Supabase catalog
begin;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
side_cat as (
  select c.id
  from public.categories c
  join burgerc b on c.store_id = b.id
  where c.name in ('Acompanhamentos', 'Batatas')
  order by c.sort_order asc
  limit 1
)
insert into public.products (store_id, category_id, name, description, price_cents, image_path, is_favorite, is_combo, sort_order, is_active)
select burgerc.id, side_cat.id, p.name, p.description, p.price_cents, p.image_path, p.is_favorite, false, p.sort_order, true
from burgerc, side_cat
cross join (values
  ('Batata Simples', 'Batata palito crocante e dourada, temperada com sal fino da casa.', 1290, '/assets/new-direction/batata-cheddar-bacon.webp', false, 10),
  ('Batata Rústica', 'Batata rustica com casca, ervas finas e sal marinho.', 1490, '/assets/new-direction/veggie-doctor.webp', false, 20),
  ('Batata Cheddar & Bacon', 'Batata crocante coberta com molho cheddar cremoso e bacon em cubos.', 1990, '/assets/new-direction/batata-cheddar-bacon.webp', true, 30),
  ('Onion Rings', 'Aneis de cebola empanados e super crocantes.', 1690, '/assets/new-direction/veggie-doctor.webp', false, 40),
  ('Nuggets 6 un', 'Empanados de frango crocantes e suculentos por dentro.', 1590, '/assets/new-direction/chicken-crispy.webp', false, 50)
) as p(name, description, price_cents, image_path, is_favorite, sort_order)
on conflict (store_id, name) do update
set category_id = excluded.category_id,
    description = excluded.description,
    price_cents = excluded.price_cents,
    image_path = excluded.image_path,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

commit;
