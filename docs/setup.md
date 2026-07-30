# Local setup

## Prerequisites

- Node 20+
- Supabase project (cloud or local CLI)

## Database

Apply SQL files in order from the SQL editor (or pipe via `psql`):

1. `backend/supabase/schema.sql`
2. `backend/supabase/policies/rls.sql`
3. `backend/supabase/storage/menu-images.sql`
4. Create Auth user for seed: `owner@serviceos.demo` / `ServiceOS!Demo1`
5. `backend/supabase/seed.sql`

Disable email confirmation in Auth settings for local demos, or confirm the user manually.

## Frontend env

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Auth redirect URLs

In Supabase Auth → URL configuration, add:

- `http://localhost:5173`
- `http://localhost:5173/verify-email`
- `http://localhost:5173/reset-password`

## Vercel

- Framework preset: Vite
- Root directory: `frontend`
- Build: `npm run build`
- Output: `dist`
- Set the same `VITE_*` env vars
