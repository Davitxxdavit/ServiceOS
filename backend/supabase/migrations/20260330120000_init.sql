-- Local apply order: schema -> RLS -> storage
-- Generated from schema.sql, policies/rls.sql, storage/menu-images.sql
-- ServiceOS schema (PostgreSQL / Supabase)
-- Apply via Supabase SQL editor or: supabase db reset

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.order_status as enum (
    'new', 'accepted', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.table_status as enum (
    'available', 'occupied', 'reserved', 'cleaning'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending', 'completed', 'failed', 'refunded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum (
    'cash', 'card', 'online', 'other'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core identity
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text,
  phone text,
  email text,
  timezone text not null default 'UTC',
  currency text not null default 'USD',
  logo_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (role_id, permission_id)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role_id uuid not null references public.roles (id),
  is_active boolean not null default true,
  hired_at date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique (restaurant_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid references public.menu_categories (id) on delete set null,
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  preparation_time_minutes int not null default 15 check (preparation_time_minutes >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Inventory (schema Phase 1, UI Phase 2)
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  unit text not null default 'unit',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  quantity numeric(14, 3) not null default 0 check (quantity >= 0),
  min_quantity numeric(14, 3) not null default 0 check (min_quantity >= 0),
  supplier_id uuid references public.suppliers (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique (restaurant_id, ingredient_id)
);

create table if not exists public.menu_item_ingredients (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  quantity numeric(14, 3) not null default 1 check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (menu_item_id, ingredient_id)
);

-- ---------------------------------------------------------------------------
-- Floor / customers / orders
-- ---------------------------------------------------------------------------
create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  capacity int not null default 2 check (capacity > 0),
  status public.table_status not null default 'available',
  position_x int not null default 0,
  position_y int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique (restaurant_id, name)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  birthday date,
  loyalty_points int not null default 0 check (loyalty_points >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id uuid references public.tables (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  employee_id uuid references public.employees (id) on delete set null,
  order_number int not null,
  status public.order_status not null default 'new',
  priority int not null default 0,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  tax numeric(12, 2) not null default 0 check (tax >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  notes text,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique (restaurant_id, order_number)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name text not null,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  method public.payment_method not null default 'cash',
  status public.payment_status not null default 'pending',
  reference text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id uuid references public.tables (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  guest_name text not null,
  guest_phone text,
  party_size int not null default 2 check (party_size > 0),
  reserved_at timestamptz not null,
  status text not null default 'confirmed',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid references public.users (id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_employees_restaurant on public.employees (restaurant_id) where deleted_at is null;
create index if not exists idx_employees_user on public.employees (user_id) where deleted_at is null;
create index if not exists idx_menu_categories_restaurant on public.menu_categories (restaurant_id) where deleted_at is null;
create index if not exists idx_menu_items_restaurant on public.menu_items (restaurant_id) where deleted_at is null;
create index if not exists idx_menu_items_category on public.menu_items (category_id) where deleted_at is null;
create index if not exists idx_tables_restaurant_status on public.tables (restaurant_id, status) where deleted_at is null;
create index if not exists idx_orders_restaurant_status on public.orders (restaurant_id, status) where deleted_at is null;
create index if not exists idx_orders_created_at on public.orders (restaurant_id, created_at desc);
create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_inventory_restaurant on public.inventory (restaurant_id) where deleted_at is null;
create index if not exists idx_customers_restaurant on public.customers (restaurant_id) where deleted_at is null;
create index if not exists idx_reservations_restaurant_time on public.reservations (restaurant_id, reserved_at) where deleted_at is null;
create index if not exists idx_notifications_user on public.notifications (user_id, is_read) where deleted_at is null;
create index if not exists idx_activity_logs_restaurant on public.activity_logs (restaurant_id, created_at desc);
create index if not exists idx_payments_order on public.payments (order_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'users','restaurants','roles','permissions','role_permissions','employees',
    'menu_categories','menu_items','suppliers','ingredients','inventory',
    'menu_item_ingredients','tables','customers','orders','order_items',
    'payments','reservations','notifications','activity_logs'
  ]
  loop
    execute format(
      'drop trigger if exists trg_%s_updated_at on public.%I;
       create trigger trg_%s_updated_at before update on public.%I
       for each row execute function public.set_updated_at();',
      t, t, t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auth profile sync
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Order number sequence helper
-- ---------------------------------------------------------------------------
create or replace function public.next_order_number(p_restaurant_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  select coalesce(max(order_number), 0) + 1 into n
  from public.orders
  where restaurant_id = p_restaurant_id;
  return n;
end;
$$;

create or replace function public.set_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_number is null or new.order_number = 0 then
    new.order_number := public.next_order_number(new.restaurant_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_number on public.orders;
create trigger trg_orders_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- Status timestamps
create or replace function public.touch_order_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'accepted' then new.accepted_at := timezone('utc', now()); end if;
    if new.status = 'preparing' then new.preparing_at := timezone('utc', now()); end if;
    if new.status = 'ready' then new.ready_at := timezone('utc', now()); end if;
    if new.status = 'completed' then new.completed_at := timezone('utc', now()); end if;
    if new.status = 'cancelled' then new.cancelled_at := timezone('utc', now()); end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_status_ts on public.orders;
create trigger trg_orders_status_ts
  before update on public.orders
  for each row execute function public.touch_order_status_timestamps();

-- ServiceOS RLS helpers + policies
-- Depends on schema.sql

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER — bypass RLS for membership checks)
-- ---------------------------------------------------------------------------
create or replace function public.get_employee_restaurant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.restaurant_id
  from public.employees e
  where e.user_id = auth.uid()
    and e.is_active = true
    and e.deleted_at is null;
$$;

create or replace function public.is_restaurant_member(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.restaurant_id = p_restaurant_id
      and e.user_id = auth.uid()
      and e.is_active = true
      and e.deleted_at is null
  );
$$;

create or replace function public.has_permission(p_restaurant_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    join public.roles r on r.id = e.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where e.restaurant_id = p_restaurant_id
      and e.user_id = auth.uid()
      and e.is_active = true
      and e.deleted_at is null
      and (p.key = p_permission or p.key = '*')
  );
$$;

create or replace function public.order_restaurant_id(p_order_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id from public.orders where id = p_order_id;
$$;

grant execute on function public.get_employee_restaurant_ids() to authenticated;
grant execute on function public.is_restaurant_member(uuid) to authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;
grant execute on function public.order_restaurant_id(uuid) to authenticated;
grant execute on function public.next_order_number(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.restaurants enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.employees enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.suppliers enable row level security;
alter table public.ingredients enable row level security;
alter table public.inventory enable row level security;
alter table public.menu_item_ingredients enable row level security;
alter table public.tables enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.reservations enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
drop policy if exists users_select_own_or_coworker on public.users;
create policy users_select_own_or_coworker on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.employees me
      join public.employees other on other.restaurant_id = me.restaurant_id
      where me.user_id = auth.uid()
        and me.is_active and me.deleted_at is null
        and other.user_id = users.id
        and other.is_active and other.deleted_at is null
    )
  );

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------------
drop policy if exists restaurants_select_member on public.restaurants;
create policy restaurants_select_member on public.restaurants
  for select to authenticated
  using (public.is_restaurant_member(id) and deleted_at is null);

drop policy if exists restaurants_update_owner on public.restaurants;
create policy restaurants_update_owner on public.restaurants
  for update to authenticated
  using (public.has_permission(id, 'settings:write'))
  with check (public.has_permission(id, 'settings:write'));

drop policy if exists restaurants_insert_authenticated on public.restaurants;
create policy restaurants_insert_authenticated on public.restaurants
  for insert to authenticated
  with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- roles / permissions (read for members)
-- ---------------------------------------------------------------------------
drop policy if exists roles_select_all on public.roles;
create policy roles_select_all on public.roles
  for select to authenticated using (true);

drop policy if exists permissions_select_all on public.permissions;
create policy permissions_select_all on public.permissions
  for select to authenticated using (true);

drop policy if exists role_permissions_select_all on public.role_permissions;
create policy role_permissions_select_all on public.role_permissions
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
drop policy if exists employees_select_member on public.employees;
create policy employees_select_member on public.employees
  for select to authenticated
  using (public.is_restaurant_member(restaurant_id) and deleted_at is null);

drop policy if exists employees_write_manager on public.employees;
create policy employees_write_manager on public.employees
  for all to authenticated
  using (public.has_permission(restaurant_id, 'employees:write'))
  with check (public.has_permission(restaurant_id, 'employees:write'));

-- Allow bootstrap: user inserts themselves as first employee of a restaurant they just created
drop policy if exists employees_insert_self_bootstrap on public.employees;
create policy employees_insert_self_bootstrap on public.employees
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.has_permission(restaurant_id, 'employees:write')
      or not exists (
        select 1 from public.employees e
        where e.restaurant_id = employees.restaurant_id
          and e.deleted_at is null
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Generic tenant table policies
-- ---------------------------------------------------------------------------
-- menu_categories
drop policy if exists menu_categories_select on public.menu_categories;
create policy menu_categories_select on public.menu_categories
  for select to authenticated
  using (public.is_restaurant_member(restaurant_id) and deleted_at is null);

drop policy if exists menu_categories_write on public.menu_categories;
create policy menu_categories_write on public.menu_categories
  for all to authenticated
  using (public.has_permission(restaurant_id, 'menu:write'))
  with check (public.has_permission(restaurant_id, 'menu:write'));

-- menu_items
drop policy if exists menu_items_select on public.menu_items;
create policy menu_items_select on public.menu_items
  for select to authenticated
  using (public.is_restaurant_member(restaurant_id) and deleted_at is null);

drop policy if exists menu_items_write on public.menu_items;
create policy menu_items_write on public.menu_items
  for all to authenticated
  using (public.has_permission(restaurant_id, 'menu:write'))
  with check (public.has_permission(restaurant_id, 'menu:write'));

-- suppliers
drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers
  for select to authenticated
  using (public.is_restaurant_member(restaurant_id) and deleted_at is null);

drop policy if exists suppliers_write on public.suppliers;
create policy suppliers_write on public.suppliers
  for all to authenticated
  using (public.has_permission(restaurant_id, 'inventory:write'))
  with check (public.has_permission(restaurant_id, 'inventory:write'));

-- ingredients
drop policy if exists ingredients_select on public.ingredients;
create policy ingredients_select on public.ingredients
  for select to authenticated
  using (public.is_restaurant_member(restaurant_id) and deleted_at is null);

drop policy if exists ingredients_write on public.ingredients;
create policy ingredients_write on public.ingredients
  for all to authenticated
  using (public.has_permission(restaurant_id, 'inventory:write'))
  with check (public.has_permission(restaurant_id, 'inventory:write'));

-- inventory
drop policy if exists inventory_select on public.inventory;
create policy inventory_select on public.inventory
  for select to authenticated
  using (public.is_restaurant_member(restaurant_id) and deleted_at is null);

drop policy if exists inventory_write on public.inventory;
create policy inventory_write on public.inventory
  for all to authenticated
  using (public.has_permission(restaurant_id, 'inventory:write'))
  with check (public.has_permission(restaurant_id, 'inventory:write'));

-- menu_item_ingredients
drop policy if exists mii_select on public.menu_item_ingredients;
create policy mii_select on public.menu_item_ingredients
  for select to authenticated
  using (
    exists (
      select 1 from public.menu_items mi
      where mi.id = menu_item_ingredients.menu_item_id
        and public.is_restaurant_member(mi.restaurant_id)
    )
  );

drop policy if exists mii_write on public.menu_item_ingredients;
create policy mii_write on public.menu_item_ingredients
  for all to authenticated
  using (
    exists (
      select 1 from public.menu_items mi
      where mi.id = menu_item_ingredients.menu_item_id
        and public.has_permission(mi.restaurant_id, 'menu:write')
    )
  )
  with check (
    exists (
      select 1 from public.menu_items mi
      where mi.id = menu_item_ingredients.menu_item_id
        and public.has_permission(mi.restaurant_id, 'menu:write')
    )
  );

-- tables
drop policy if exists tables_select on public.tables;
create policy tables_select on public.tables
  for select to authenticated
  using (public.is_restaurant_member(restaurant_id) and deleted_at is null);

drop policy if exists tables_write on public.tables;
create policy tables_write on public.tables
  for all to authenticated
  using (public.has_permission(restaurant_id, 'tables:write'))
  with check (public.has_permission(restaurant_id, 'tables:write'));

-- customers
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select to authenticated
  using (
    public.has_permission(restaurant_id, 'customers:read')
    and deleted_at is null
  );

drop policy if exists customers_write on public.customers;
create policy customers_write on public.customers
  for all to authenticated
  using (public.has_permission(restaurant_id, 'customers:write'))
  with check (public.has_permission(restaurant_id, 'customers:write'));

-- orders
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated
  using (
    public.has_permission(restaurant_id, 'orders:read')
    and deleted_at is null
  );

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert to authenticated
  with check (public.has_permission(restaurant_id, 'orders:write'));

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
  for update to authenticated
  using (
    public.has_permission(restaurant_id, 'orders:write')
    or public.has_permission(restaurant_id, 'kitchen:write')
  )
  with check (
    public.has_permission(restaurant_id, 'orders:write')
    or public.has_permission(restaurant_id, 'kitchen:write')
  );

-- order_items
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select to authenticated
  using (
    public.has_permission(public.order_restaurant_id(order_id), 'orders:read')
  );

drop policy if exists order_items_write on public.order_items;
create policy order_items_write on public.order_items
  for all to authenticated
  using (public.has_permission(public.order_restaurant_id(order_id), 'orders:write'))
  with check (public.has_permission(public.order_restaurant_id(order_id), 'orders:write'));

-- payments
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (
    public.has_permission(restaurant_id, 'payments:read')
    and deleted_at is null
  );

drop policy if exists payments_write on public.payments;
create policy payments_write on public.payments
  for all to authenticated
  using (public.has_permission(restaurant_id, 'payments:write'))
  with check (public.has_permission(restaurant_id, 'payments:write'));

-- reservations
drop policy if exists reservations_select on public.reservations;
create policy reservations_select on public.reservations
  for select to authenticated
  using (
    public.has_permission(restaurant_id, 'reservations:read')
    and deleted_at is null
  );

drop policy if exists reservations_write on public.reservations;
create policy reservations_write on public.reservations
  for all to authenticated
  using (public.has_permission(restaurant_id, 'reservations:write'))
  with check (public.has_permission(restaurant_id, 'reservations:write'));

-- notifications
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (
    public.is_restaurant_member(restaurant_id)
    and (user_id is null or user_id = auth.uid())
    and deleted_at is null
  );

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid() or public.has_permission(restaurant_id, '*'))
  with check (user_id = auth.uid() or public.has_permission(restaurant_id, '*'));

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (public.has_permission(restaurant_id, 'notifications:write') or public.has_permission(restaurant_id, '*'));

-- activity_logs
drop policy if exists activity_logs_select on public.activity_logs;
create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using (public.has_permission(restaurant_id, 'analytics:read') or public.has_permission(restaurant_id, '*'));

drop policy if exists activity_logs_insert on public.activity_logs;
create policy activity_logs_insert on public.activity_logs
  for insert to authenticated
  with check (public.is_restaurant_member(restaurant_id));

-- Realtime publication
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.order_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tables;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- Storage bucket + policies for menu images

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists menu_images_public_read on storage.objects;
create policy menu_images_public_read on storage.objects
  for select
  using (bucket_id = 'menu-images');

drop policy if exists menu_images_authenticated_upload on storage.objects;
create policy menu_images_authenticated_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] is not null
    and public.has_permission(((storage.foldername(name))[1])::uuid, 'menu:write')
  );

drop policy if exists menu_images_authenticated_update on storage.objects;
create policy menu_images_authenticated_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'menu-images'
    and public.has_permission(((storage.foldername(name))[1])::uuid, 'menu:write')
  )
  with check (
    bucket_id = 'menu-images'
    and public.has_permission(((storage.foldername(name))[1])::uuid, 'menu:write')
  );

drop policy if exists menu_images_authenticated_delete on storage.objects;
create policy menu_images_authenticated_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-images'
    and public.has_permission(((storage.foldername(name))[1])::uuid, 'menu:write')
  );
