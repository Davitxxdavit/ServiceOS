# Architecture

ServiceOS is a multi-tenant restaurant operations SaaS. The frontend talks only to Supabase (Auth, PostgREST, Realtime, Storage). Authorization is enforced in PostgreSQL via Row Level Security — React route guards are UX only.

## Tenancy

Every business row carries `restaurant_id`. Membership is modeled as `employees` (user ↔ restaurant ↔ role). Helper functions `is_restaurant_member` and `has_permission` power RLS policies.

## Frontend layout

Feature-based modules under `frontend/src/features/*` each own `components`, `hooks`, `services`, and `types`. Shared chrome lives in `layouts`, `components`, and `app`.

## Data flow

1. Supabase Auth issues JWT + refresh tokens; session persisted in the browser.
2. TanStack Query loads tenant data scoped by the active restaurant from Zustand.
3. Mutations write through Supabase client; RLS validates permission keys.
4. Realtime channels invalidate order/table/dashboard queries.

## Phase 1 revenue note

Dashboard revenue uses completed/delivered order totals. When the Cashier/payments module lands, `payments` becomes the source of truth.
