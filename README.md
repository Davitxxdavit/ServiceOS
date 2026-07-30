# ServiceOS

Production-minded restaurant management SaaS for portfolio demonstration — Phase 1.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn-style UI, TanStack Query, Zustand, React Hook Form, Zod, Recharts, dnd-kit, Framer Motion
- **Backend:** Supabase (Auth, PostgreSQL, RLS, Realtime, Storage)

## Quick start

### 1. Supabase

1. Create a Supabase project
2. In the SQL editor, run in order:
   - [`backend/supabase/schema.sql`](backend/supabase/schema.sql)
   - [`backend/supabase/policies/rls.sql`](backend/supabase/policies/rls.sql)
   - [`backend/supabase/storage/menu-images.sql`](backend/supabase/storage/menu-images.sql)
3. Create Auth user `owner@serviceos.demo` / `ServiceOS!Demo1` (confirm email in dashboard if needed)
4. Run [`backend/supabase/seed.sql`](backend/supabase/seed.sql)

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open http://localhost:5173 and sign in with the demo owner (or create a new restaurant via signup).

## Phase 1 modules

| Module | Status |
|--------|--------|
| Auth (login, signup, verify, forgot/reset) | Done |
| Dashboard | Done |
| Orders + realtime | Done |
| Kitchen Kanban (dnd + timers) | Done |
| Tables floor | Done |
| Menu CRUD + images | Done |
| Inventory / Customers / Employees / Analytics / Reservations / Settings | Schema + nav stubs (Phase 2/3) |

## Docs

- [Architecture](docs/architecture.md)
- [RBAC](docs/rbac.md)
- [Setup](docs/setup.md)
- [ERD](docs/erd.md)

## Deploy

- Frontend → Vercel (root `frontend`, env vars as above)
- Backend → Supabase project migrations / SQL

Never commit service-role keys. Frontend uses the anon key only; authorization is enforced by RLS.
