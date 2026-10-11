update public.delivery_zones dz
set is_active = false
from public.stores s
where dz.store_id = s.id
  and s.slug = 'burgerc'
  and dz.name in ('Alta o mateus', 'Marcos inacio');
