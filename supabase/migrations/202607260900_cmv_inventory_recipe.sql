-- Professional kitchen costing layer for BurgerC/Doutor Burger.
-- Adds raw materials, product recipes and basic stock movement support
-- without changing the already-applied initial schema.

create table if not exists public.raw_materials (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  category text not null default 'Extras',
  unit text not null default 'un',
  cost_per_unit_cents integer not null default 0 check (cost_per_unit_cents >= 0),
  stock_quantity numeric(12,3) not null default 0 check (stock_quantity >= 0),
  min_stock_quantity numeric(12,3) not null default 0 check (min_stock_quantity >= 0),
  supplier text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, name)
);

create table if not exists public.product_recipe_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  raw_material_id uuid not null references public.raw_materials(id) on delete restrict,
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  waste_percent numeric(5,2) not null default 0 check (waste_percent >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, raw_material_id)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  raw_material_id uuid not null references public.raw_materials(id) on delete restrict,
  movement_type text not null check (movement_type in ('purchase','adjustment','waste','recipe_use')),
  quantity numeric(12,3) not null check (quantity <> 0),
  unit_cost_cents integer check (unit_cost_cents is null or unit_cost_cents >= 0),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists raw_materials_store_active_idx
  on public.raw_materials(store_id, is_active, category, name);

create index if not exists product_recipe_items_product_idx
  on public.product_recipe_items(product_id, sort_order);

create index if not exists stock_movements_store_created_idx
  on public.stock_movements(store_id, created_at desc);

drop trigger if exists raw_materials_set_updated_at on public.raw_materials;
create trigger raw_materials_set_updated_at
before update on public.raw_materials
for each row execute function public.set_updated_at();

drop trigger if exists product_recipe_items_set_updated_at on public.product_recipe_items;
create trigger product_recipe_items_set_updated_at
before update on public.product_recipe_items
for each row execute function public.set_updated_at();

alter table public.raw_materials enable row level security;
alter table public.product_recipe_items enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists raw_materials_staff_select on public.raw_materials;
create policy raw_materials_staff_select on public.raw_materials for select
  using (public.is_store_member(store_id));

drop policy if exists raw_materials_manager_insert on public.raw_materials;
create policy raw_materials_manager_insert on public.raw_materials for insert
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

drop policy if exists raw_materials_manager_update on public.raw_materials;
create policy raw_materials_manager_update on public.raw_materials for update
  using (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]))
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

drop policy if exists recipe_items_staff_select on public.product_recipe_items;
create policy recipe_items_staff_select on public.product_recipe_items for select
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_recipe_items.product_id
        and public.is_store_member(p.store_id)
    )
  );

drop policy if exists recipe_items_manager_insert on public.product_recipe_items;
create policy recipe_items_manager_insert on public.product_recipe_items for insert
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_recipe_items.product_id
        and public.has_store_role(p.store_id, array['owner','admin','manager']::public.membership_role[])
    )
  );

drop policy if exists recipe_items_manager_update on public.product_recipe_items;
create policy recipe_items_manager_update on public.product_recipe_items for update
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_recipe_items.product_id
        and public.has_store_role(p.store_id, array['owner','admin','manager']::public.membership_role[])
    )
  )
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_recipe_items.product_id
        and public.has_store_role(p.store_id, array['owner','admin','manager']::public.membership_role[])
    )
  );

drop policy if exists recipe_items_manager_delete on public.product_recipe_items;
create policy recipe_items_manager_delete on public.product_recipe_items for delete
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_recipe_items.product_id
        and public.has_store_role(p.store_id, array['owner','admin','manager']::public.membership_role[])
    )
  );

drop policy if exists stock_movements_staff_select on public.stock_movements;
create policy stock_movements_staff_select on public.stock_movements for select
  using (public.is_store_member(store_id));

drop policy if exists stock_movements_manager_insert on public.stock_movements;
create policy stock_movements_manager_insert on public.stock_movements for insert
  with check (public.has_store_role(store_id, array['owner','admin','manager']::public.membership_role[]));

grant select on public.raw_materials, public.product_recipe_items, public.stock_movements to authenticated;
grant insert, update on public.raw_materials to authenticated;
grant insert, update, delete on public.product_recipe_items to authenticated;
grant insert on public.stock_movements to authenticated;

create or replace function public.product_recipe_cost_cents(p_product_id uuid)
returns integer
language sql
stable
security invoker
as $$
  select coalesce(
    round(sum(rm.cost_per_unit_cents * pri.quantity * (1 + pri.waste_percent / 100.0)))::integer,
    0
  )
  from public.product_recipe_items pri
  join public.raw_materials rm on rm.id = pri.raw_material_id
  where pri.product_id = p_product_id
    and rm.is_active;
$$;

grant execute on function public.product_recipe_cost_cents(uuid) to authenticated;

with burgerc as (
  select id from public.stores where slug = 'burgerc'
),
seed_materials(name, category, unit, cost_per_unit_cents, stock_quantity, min_stock_quantity) as (
  values
    ('Pão brioche dourado', 'Pães', 'un', 180, 80, 20),
    ('Pão australiano macio', 'Pães', 'un', 210, 40, 12),
    ('Pão com gergelim tostado', 'Pães', 'un', 160, 40, 12),
    ('Blend bovino 90g suculento', 'Carnes', 'un', 420, 100, 25),
    ('Duplo blend bovino 90g', 'Carnes', 'un', 840, 60, 16),
    ('Blend de frango empanado crocante', 'Carnes', 'un', 390, 40, 12),
    ('Queijo cheddar derretido cremoso', 'Queijos', 'un', 125, 120, 30),
    ('Queijo prato derretido suave', 'Queijos', 'un', 110, 100, 25),
    ('Queijo coalho tostado na chapa', 'Queijos', 'un', 220, 50, 12),
    ('Bacon crocante em tiras', 'Extras', 'porção', 240, 60, 15),
    ('Bacon em cubos dourados', 'Extras', 'porção', 220, 60, 15),
    ('Abacaxi caramelizado', 'Extras', 'porção', 140, 35, 8),
    ('Ovo frito com gema mole', 'Extras', 'un', 110, 60, 18),
    ('Maionese artesanal da casa', 'Molhos', 'porção', 80, 120, 30),
    ('Maionese verde de ervas frescas', 'Molhos', 'porção', 95, 80, 20),
    ('Maionese de alho tostado', 'Molhos', 'porção', 90, 80, 20),
    ('Maionese defumada artesanal', 'Molhos', 'porção', 105, 80, 20),
    ('Barbecue rústico defumado', 'Molhos', 'porção', 95, 40, 10),
    ('Salada fresca (alface americana e tomate)', 'Saladas', 'porção', 115, 50, 14),
    ('Cebola roxa fresca fatiada', 'Saladas', 'porção', 45, 50, 12),
    ('Cebola chapeada na manteiga', 'Saladas', 'porção', 75, 45, 12),
    ('Cebola caramelizada no vinho', 'Saladas', 'porção', 120, 40, 10),
    ('Picles agridoce crocante', 'Saladas', 'porção', 55, 40, 10)
)
insert into public.raw_materials (
  store_id,
  name,
  category,
  unit,
  cost_per_unit_cents,
  stock_quantity,
  min_stock_quantity
)
select
  burgerc.id,
  seed_materials.name,
  seed_materials.category,
  seed_materials.unit,
  seed_materials.cost_per_unit_cents,
  seed_materials.stock_quantity,
  seed_materials.min_stock_quantity
from burgerc
cross join seed_materials
on conflict (store_id, name) do update
set
  category = excluded.category,
  unit = excluded.unit,
  cost_per_unit_cents = excluded.cost_per_unit_cents,
  min_stock_quantity = excluded.min_stock_quantity,
  is_active = true;
