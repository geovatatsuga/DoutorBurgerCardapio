alter table public.delivery_zones
  add column if not exists zone_label text,
  add column if not exists delivery_time_label text;

with configured(name, zone_label, delivery_time_label, delivery_fee_cents) as (
  values
    ('Alto do Mateus', 'Zona 1 (Local)', '5 minutos', 0),
    ('Ilha do Bispo', 'Zona 2 (Vizinhança)', '5 a 10 minutos', 500),
    ('Bairro dos Novais', 'Zona 2 (Vizinhança)', '5 a 10 minutos', 500),
    ('Bairro das Indústrias', 'Zona 2 (Vizinhança)', '5 a 10 minutos', 500),
    ('Juracy Palhano', 'Zona 2 (Vizinhança)', '5 a 10 minutos', 500),
    ('Bayeux - Imaculada', 'Zona 2 (Vizinhança)', '5 a 10 minutos', 500),
    ('Bayeux - Sesi', 'Zona 2 (Vizinhança)', '5 a 10 minutos', 500),
    ('Bayeux - Centro', 'Zona 2 (Vizinhança)', '5 a 10 minutos', 500),
    ('Cruz das Armas', 'Zona 3 (Intermédia)', '10 a 15 minutos', 800),
    ('Oitizeiro', 'Zona 3 (Intermédia)', '10 a 15 minutos', 800),
    ('Trincheiras', 'Zona 3 (Intermédia)', '10 a 15 minutos', 800),
    ('Jaguaribe', 'Zona 3 (Intermédia)', '10 a 15 minutos', 800),
    ('Centro', 'Zona 3 (Intermédia)', '10 a 15 minutos', 800),
    ('Varadouro', 'Zona 3 (Intermédia)', '10 a 15 minutos', 800),
    ('Bayeux - Tambaí', 'Zona 3 (Intermédia)', '10 a 15 minutos', 800),
    ('Bayeux - Alto da Boa Vista', 'Zona 3 (Intermédia)', '10 a 15 minutos', 800),
    ('Bayeux - Mário Andreazza', 'Zona 3 (Intermédia)', '10 a 15 minutos', 800),
    ('Cristo Redentor', 'Zona 4 (Limite)', '15 a 20 minutos', 1200),
    ('Róger', 'Zona 4 (Limite)', '15 a 20 minutos', 1200),
    ('Torre', 'Zona 4 (Limite)', '15 a 20 minutos', 1200),
    ('Tambiá', 'Zona 4 (Limite)', '15 a 20 minutos', 1200)
)
insert into public.delivery_zones (store_id, name, zone_label, delivery_time_label, delivery_fee_cents, min_order_cents, is_active)
select s.id, c.name, c.zone_label, c.delivery_time_label, c.delivery_fee_cents, s.min_order_cents, true
from public.stores s
cross join configured c
where s.slug = 'burgerc'
on conflict (store_id, name) do update set
  zone_label = excluded.zone_label,
  delivery_time_label = excluded.delivery_time_label,
  delivery_fee_cents = excluded.delivery_fee_cents,
  is_active = true;
