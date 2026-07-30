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
