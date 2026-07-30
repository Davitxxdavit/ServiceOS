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
