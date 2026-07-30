-- ServiceOS seed data
-- Prerequisites:
-- 1. Apply schema.sql, policies/rls.sql, storage/menu-images.sql
-- 2. Create Auth user via Dashboard or:
--      email: owner@serviceos.demo  password: ServiceOS!Demo1
--    Then replace :demo_user_id below with that user's UUID,
--    OR use the block that looks up by email.

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
insert into public.roles (id, name, slug, description) values
  ('11111111-1111-1111-1111-111111111001', 'Owner', 'owner', 'Full access to all modules'),
  ('11111111-1111-1111-1111-111111111002', 'Manager', 'manager', 'Orders, inventory, customers, analytics'),
  ('11111111-1111-1111-1111-111111111003', 'Chef', 'chef', 'Kitchen and order status'),
  ('11111111-1111-1111-1111-111111111004', 'Waiter', 'waiter', 'Orders, tables, customers'),
  ('11111111-1111-1111-1111-111111111005', 'Cashier', 'cashier', 'Payments and orders')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (id, key, description) values
  ('22222222-2222-2222-2222-222222222000', '*', 'All permissions'),
  ('22222222-2222-2222-2222-222222222001', 'orders:read', 'View orders'),
  ('22222222-2222-2222-2222-222222222002', 'orders:write', 'Create and update orders'),
  ('22222222-2222-2222-2222-222222222003', 'kitchen:write', 'Update kitchen order status'),
  ('22222222-2222-2222-2222-222222222004', 'tables:read', 'View floor tables'),
  ('22222222-2222-2222-2222-222222222005', 'tables:write', 'Update table status'),
  ('22222222-2222-2222-2222-222222222006', 'menu:read', 'View menu'),
  ('22222222-2222-2222-2222-222222222007', 'menu:write', 'Manage menu'),
  ('22222222-2222-2222-2222-222222222008', 'inventory:read', 'View inventory'),
  ('22222222-2222-2222-2222-222222222009', 'inventory:write', 'Manage inventory'),
  ('22222222-2222-2222-2222-222222222010', 'customers:read', 'View customers'),
  ('22222222-2222-2222-2222-222222222011', 'customers:write', 'Manage customers'),
  ('22222222-2222-2222-2222-222222222012', 'employees:read', 'View employees'),
  ('22222222-2222-2222-2222-222222222013', 'employees:write', 'Manage employees'),
  ('22222222-2222-2222-2222-222222222014', 'analytics:read', 'View analytics'),
  ('22222222-2222-2222-2222-222222222015', 'payments:read', 'View payments'),
  ('22222222-2222-2222-2222-222222222016', 'payments:write', 'Process payments'),
  ('22222222-2222-2222-2222-222222222017', 'reservations:read', 'View reservations'),
  ('22222222-2222-2222-2222-222222222018', 'reservations:write', 'Manage reservations'),
  ('22222222-2222-2222-2222-222222222019', 'settings:write', 'Manage restaurant settings'),
  ('22222222-2222-2222-2222-222222222020', 'notifications:write', 'Create notifications')
on conflict (key) do nothing;

-- Owner: *
insert into public.role_permissions (role_id, permission_id)
select '11111111-1111-1111-1111-111111111001', id from public.permissions where key = '*'
on conflict do nothing;

-- Manager
insert into public.role_permissions (role_id, permission_id)
select '11111111-1111-1111-1111-111111111002', id
from public.permissions
where key in (
  'orders:read','orders:write','tables:read','tables:write','menu:read','menu:write',
  'inventory:read','inventory:write','customers:read','customers:write',
  'employees:read','analytics:read','payments:read','reservations:read','reservations:write',
  'notifications:write'
)
on conflict do nothing;

-- Chef
insert into public.role_permissions (role_id, permission_id)
select '11111111-1111-1111-1111-111111111003', id
from public.permissions
where key in ('orders:read','kitchen:write','menu:read')
on conflict do nothing;

-- Waiter
insert into public.role_permissions (role_id, permission_id)
select '11111111-1111-1111-1111-111111111004', id
from public.permissions
where key in (
  'orders:read','orders:write','tables:read','tables:write',
  'customers:read','customers:write','menu:read','reservations:read'
)
on conflict do nothing;

-- Cashier
insert into public.role_permissions (role_id, permission_id)
select '11111111-1111-1111-1111-111111111005', id
from public.permissions
where key in ('orders:read','orders:write','payments:read','payments:write','menu:read')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Demo restaurant
-- ---------------------------------------------------------------------------
insert into public.restaurants (id, name, slug, address, phone, email, timezone, currency)
values (
  '33333333-3333-3333-3333-333333333333',
  'Harbor & Thyme',
  'harbor-thyme',
  '128 Market Street, Austin, TX',
  '+1-512-555-0142',
  'hello@harborandthyme.demo',
  'America/Chicago',
  'USD'
)
on conflict (slug) do nothing;

-- Link demo owner (requires auth user with this email already created)
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'owner@serviceos.demo' limit 1;

  if v_user_id is null then
    raise notice 'No auth user owner@serviceos.demo found. Create the user in Supabase Auth, then re-run the employee insert section.';
  else
    insert into public.users (id, email, full_name)
    values (v_user_id, 'owner@serviceos.demo', 'Alex Owner')
    on conflict (id) do update set full_name = excluded.full_name;

    insert into public.employees (id, restaurant_id, user_id, role_id, is_active, hired_at)
    values (
      '44444444-4444-4444-4444-444444444444',
      '33333333-3333-3333-3333-333333333333',
      v_user_id,
      '11111111-1111-1111-1111-111111111001',
      true,
      current_date
    )
    on conflict (restaurant_id, user_id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
insert into public.menu_categories (id, restaurant_id, name, description, sort_order) values
  ('55555555-5555-5555-5555-555555555001', '33333333-3333-3333-3333-333333333333', 'Starters', 'Shareable openers', 1),
  ('55555555-5555-5555-5555-555555555002', '33333333-3333-3333-3333-333333333333', 'Mains', 'House signatures', 2),
  ('55555555-5555-5555-5555-555555555003', '33333333-3333-3333-3333-333333333333', 'Desserts', 'Sweet finishes', 3)
on conflict do nothing;

insert into public.menu_items (id, restaurant_id, category_id, name, description, price, preparation_time_minutes, sort_order) values
  ('66666666-6666-6666-6666-666666666001', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555001', 'Charred Broccolini', 'Lemon zest, chili oil, almond', 12.00, 12, 1),
  ('66666666-6666-6666-6666-666666666002', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555001', 'Citrus Cured Salmon', 'Fennel, crème fraîche, rye crisp', 16.00, 10, 2),
  ('66666666-6666-6666-6666-666666666003', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555002', 'Herb Roast Chicken', 'Pan jus, roasted roots', 28.00, 25, 1),
  ('66666666-6666-6666-6666-666666666004', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555002', 'Seared Sea Bass', 'Brown butter, capers, greens', 34.00, 22, 2),
  ('66666666-6666-6666-6666-666666666005', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555002', 'Dry-Aged Ribeye', 'Bone marrow butter, fries', 48.00, 30, 3),
  ('66666666-6666-6666-6666-666666666006', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555003', 'Olive Oil Cake', 'Citrus curd, pistachio', 11.00, 8, 1)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Ingredients / inventory (for dashboard low-stock demo)
-- ---------------------------------------------------------------------------
insert into public.ingredients (id, restaurant_id, name, unit) values
  ('77777777-7777-7777-7777-777777777001', '33333333-3333-3333-3333-333333333333', 'Sea Bass Fillet', 'portion'),
  ('77777777-7777-7777-7777-777777777002', '33333333-3333-3333-3333-333333333333', 'Dry-Aged Ribeye', 'portion'),
  ('77777777-7777-7777-7777-777777777003', '33333333-3333-3333-3333-333333333333', 'Fresh Herbs', 'bunch')
on conflict do nothing;

insert into public.inventory (restaurant_id, ingredient_id, quantity, min_quantity) values
  ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777001', 4, 8),
  ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777002', 2, 6),
  ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777003', 18, 5)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Floor tables
-- ---------------------------------------------------------------------------
insert into public.tables (id, restaurant_id, name, capacity, status, position_x, position_y) values
  ('88888888-8888-8888-8888-888888888001', '33333333-3333-3333-3333-333333333333', 'T1', 2, 'available', 0, 0),
  ('88888888-8888-8888-8888-888888888002', '33333333-3333-3333-3333-333333333333', 'T2', 2, 'occupied', 1, 0),
  ('88888888-8888-8888-8888-888888888003', '33333333-3333-3333-3333-333333333333', 'T3', 4, 'occupied', 2, 0),
  ('88888888-8888-8888-8888-888888888004', '33333333-3333-3333-3333-333333333333', 'T4', 4, 'reserved', 0, 1),
  ('88888888-8888-8888-8888-888888888005', '33333333-3333-3333-3333-333333333333', 'T5', 6, 'available', 1, 1),
  ('88888888-8888-8888-8888-888888888006', '33333333-3333-3333-3333-333333333333', 'T6', 2, 'cleaning', 2, 1),
  ('88888888-8888-8888-8888-888888888007', '33333333-3333-3333-3333-333333333333', 'Bar 1', 2, 'available', 0, 2),
  ('88888888-8888-8888-8888-888888888008', '33333333-3333-3333-3333-333333333333', 'Patio A', 4, 'available', 1, 2)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Sample orders (varied kitchen statuses)
-- ---------------------------------------------------------------------------
insert into public.orders (
  id, restaurant_id, table_id, order_number, status, priority, subtotal, tax, total, notes,
  accepted_at, preparing_at, created_at
) values
  (
    '99999999-9999-9999-9999-999999999001',
    '33333333-3333-3333-3333-333333333333',
    '88888888-8888-8888-8888-888888888002',
    1001, 'preparing', 1, 44.00, 3.52, 47.52, 'Allergy: nuts',
    timezone('utc', now()) - interval '18 minutes',
    timezone('utc', now()) - interval '12 minutes',
    timezone('utc', now()) - interval '20 minutes'
  ),
  (
    '99999999-9999-9999-9999-999999999002',
    '33333333-3333-3333-3333-333333333333',
    '88888888-8888-8888-8888-888888888003',
    1002, 'new', 2, 62.00, 4.96, 66.96, null,
    null, null,
    timezone('utc', now()) - interval '4 minutes'
  ),
  (
    '99999999-9999-9999-9999-999999999003',
    '33333333-3333-3333-3333-333333333333',
    '88888888-8888-8888-8888-888888888002',
    1003, 'ready', 0, 11.00, 0.88, 11.88, null,
    timezone('utc', now()) - interval '30 minutes',
    timezone('utc', now()) - interval '25 minutes',
    timezone('utc', now()) - interval '35 minutes'
  ),
  (
    '99999999-9999-9999-9999-999999999004',
    '33333333-3333-3333-3333-333333333333',
    null,
    1004, 'completed', 0, 76.00, 6.08, 82.08, null,
    timezone('utc', now()) - interval '3 hours',
    timezone('utc', now()) - interval '3 hours',
    timezone('utc', now()) - interval '3 hours'
  ),
  (
    '99999999-9999-9999-9999-999999999005',
    '33333333-3333-3333-3333-333333333333',
    '88888888-8888-8888-8888-888888888003',
    1005, 'accepted', 0, 28.00, 2.24, 30.24, null,
    timezone('utc', now()) - interval '6 minutes',
    null,
    timezone('utc', now()) - interval '8 minutes'
  )
on conflict do nothing;

update public.orders
set completed_at = timezone('utc', now()) - interval '2 hours 30 minutes',
    ready_at = timezone('utc', now()) - interval '2 hours 40 minutes'
where id = '99999999-9999-9999-9999-999999999004';

update public.orders
set ready_at = timezone('utc', now()) - interval '5 minutes'
where id = '99999999-9999-9999-9999-999999999003';

insert into public.order_items (order_id, menu_item_id, name, quantity, unit_price, total_price) values
  ('99999999-9999-9999-9999-999999999001', '66666666-6666-6666-6666-666666666003', 'Herb Roast Chicken', 1, 28.00, 28.00),
  ('99999999-9999-9999-9999-999999999001', '66666666-6666-6666-6666-666666666001', 'Charred Broccolini', 1, 12.00, 12.00),
  ('99999999-9999-9999-9999-999999999001', '66666666-6666-6666-6666-666666666006', 'Olive Oil Cake', 1, 11.00, 11.00),
  ('99999999-9999-9999-9999-999999999002', '66666666-6666-6666-6666-666666666005', 'Dry-Aged Ribeye', 1, 48.00, 48.00),
  ('99999999-9999-9999-9999-999999999002', '66666666-6666-6666-6666-666666666002', 'Citrus Cured Salmon', 1, 16.00, 16.00),
  ('99999999-9999-9999-9999-999999999003', '66666666-6666-6666-6666-666666666006', 'Olive Oil Cake', 1, 11.00, 11.00),
  ('99999999-9999-9999-9999-999999999004', '66666666-6666-6666-6666-666666666004', 'Seared Sea Bass', 1, 34.00, 34.00),
  ('99999999-9999-9999-9999-999999999004', '66666666-6666-6666-6666-666666666005', 'Dry-Aged Ribeye', 1, 48.00, 48.00),
  ('99999999-9999-9999-9999-999999999005', '66666666-6666-6666-6666-666666666003', 'Herb Roast Chicken', 1, 28.00, 28.00)
on conflict do nothing;

insert into public.reservations (restaurant_id, table_id, guest_name, guest_phone, party_size, reserved_at, status)
values
  ('33333333-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888004', 'Jordan Lee', '+1-512-555-0199', 4, timezone('utc', now()) + interval '2 hours', 'confirmed'),
  ('33333333-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888005', 'Sam Rivera', '+1-512-555-0177', 6, timezone('utc', now()) + interval '5 hours', 'confirmed')
on conflict do nothing;

insert into public.activity_logs (restaurant_id, action, entity_type, entity_id, metadata)
values
  ('33333333-3333-3333-3333-333333333333', 'order.created', 'order', '99999999-9999-9999-9999-999999999002', '{"order_number":1002}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'order.status_changed', 'order', '99999999-9999-9999-9999-999999999001', '{"to":"preparing"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'inventory.low_stock', 'ingredient', '77777777-7777-7777-7777-777777777002', '{"name":"Dry-Aged Ribeye"}'::jsonb)
on conflict do nothing;

insert into public.notifications (restaurant_id, title, body, type, metadata)
values
  ('33333333-3333-3333-3333-333333333333', 'Low stock: Dry-Aged Ribeye', 'Only 2 portions left (min 6).', 'warning', '{"ingredient_id":"77777777-7777-7777-7777-777777777002"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'Low stock: Sea Bass Fillet', 'Only 4 portions left (min 8).', 'warning', '{"ingredient_id":"77777777-7777-7777-7777-777777777001"}'::jsonb)
on conflict do nothing;
