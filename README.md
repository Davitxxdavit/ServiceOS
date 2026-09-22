# ServiceOS — Restaurant Management SaaS

[![CI](https://github.com/Davitxxdavit/ServiceOS/actions/workflows/ci.yml/badge.svg)](https://github.com/Davitxxdavit/ServiceOS/actions/workflows/ci.yml)

Multi-tenant restaurant operations app: live orders, a drag-and-drop kitchen board, a table floor plan, menu management, inventory with reorder alerts, and an **AI assistant that streams answers over live restaurant data**. Each restaurant is isolated with Supabase row-level security, and permissions for five staff roles (owner, manager, chef, waiter, cashier) are enforced in the database.

![Inventory: stock levels with sorting, filters and pagination](docs/screenshots/inventory.png)

![AI assistant: streamed answer with structured metric cards and a reorder table](docs/screenshots/assistant.png)

<p>
  <img src="docs/screenshots/inventory-mobile.png" alt="Inventory on a phone" width="220">
  <img src="docs/screenshots/assistant-mobile.png" alt="Assistant on a phone" width="220">
  <img src="docs/screenshots/mobile.png" alt="Sign-in on a phone" width="220">
</p>

> Screenshots use the seeded demo restaurant.

## Highlights

- **Security in the database, not the UI.** RLS policies plus `has_permission()` checks mean a waiter can't write inventory even by calling the API directly. The AI assistant runs with the caller's JWT, so it can only see what that user can see.
- **AI assistant with streaming + tool calling.** A Supabase Edge Function runs a Claude tool-use loop over four read-only data tools and streams Server-Sent Events. The model returns structured JSON (`show_metrics`, `show_table`) that is validated with Zod on the client before rendering — malformed output is dropped, never rendered. Works without an API key in a templated demo mode.
- **Data table done properly.** Search, status and supplier filters, sortable columns, pagination, optimistic `+/-` stock updates with rollback, and table state in the URL so filtered views can be bookmarked.
- **Realtime.** Orders, kitchen and tables update live through Supabase Realtime.
- **Responsive.** Mobile navigation drawer, card layouts for tables on small screens.
- **Tested.** Vitest + React Testing Library for table logic, schemas, the SSE parser, the chat reducer and page behaviour; Deno tests for the model-stream parser. CI runs lint, typecheck, tests and build on every push.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, React Router, React Hook Form, Zod, Recharts, dnd-kit, Framer Motion
- **Backend:** Supabase — Postgres, Auth, RLS, Realtime, Storage, Edge Functions (Deno)
- **AI:** Claude via the Messages API (tool use + streaming)
- **Quality:** Vitest, Testing Library, oxlint, GitHub Actions

## Modules

| Module | Status |
|--------|--------|
| Auth (login, signup, verify, forgot/reset) | Done |
| Dashboard | Done |
| Orders + realtime | Done |
| Kitchen Kanban (drag-and-drop + timers) | Done |
| Tables floor | Done |
| Menu CRUD + images | Done |
| Inventory (stock, reorder points, suppliers) | Done |
| AI assistant (streaming, tool calling) | Done |
| Customers / Employees / Analytics / Reservations / Settings | Schema + RLS ready, UI planned |

## Run locally

Requires Node 20+ and Docker (for the Supabase CLI).

```bash
# 1. Start Postgres, Auth, Realtime, Storage and Edge Functions; applies migration + seed
npx supabase start --workdir backend

# 2. Frontend
cd frontend
cp .env.example .env          # already points at the local Supabase stack
npm install
npm run dev
```

Open http://localhost:5173 and sign in as **owner@serviceos.demo / ServiceOS!Demo1**.

### AI assistant

Works out of the box in **demo mode** (templated answers from live data, no key needed). For real model answers:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > backend/supabase/functions/.env
npx supabase functions serve ai-assistant --workdir backend --env-file backend/supabase/functions/.env
```

See [backend/supabase/functions/README.md](backend/supabase/functions/README.md) for the event protocol and deployment.

## Scripts (in `frontend/`)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server |
| `npm test` | Unit + component tests |
| `npm run lint` | oxlint |
| `npm run typecheck` | TypeScript project build |
| `npm run build` | Typecheck + production build (routes are code-split) |

## Project structure

```
frontend/src/
  features/<module>/     components · hooks · services · types · lib (pure, tested logic)
  components/ui/         shared UI primitives
  layouts/ routes/ store/ lib/
backend/supabase/
  migrations/            schema + RLS + storage (applied by `supabase start`)
  functions/ai-assistant Edge Function: tool loop, SSE streaming, demo mode
  seed.sql               demo restaurant, menu, orders, inventory, suppliers
```

## Docs

- [Architecture](docs/architecture.md)
- [RBAC](docs/rbac.md)
- [Setup](docs/setup.md)
- [ERD](docs/erd.md)

## Deploy

- Frontend → Vercel (root `frontend`, set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`)
- Database → `supabase db push`; Edge Function → `supabase functions deploy ai-assistant` + `supabase secrets set ANTHROPIC_API_KEY=...`

Never commit service-role or model API keys. The frontend uses the anon key only; authorization is enforced by RLS.
