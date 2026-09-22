# Edge Functions

## `ai-assistant`

Streaming operations assistant used by the **Assistant** page.

- Runs with the caller's JWT, so all data access goes through Postgres RLS.
- Uses Claude tool calling: four read-only data tools (`get_sales_summary`, `get_top_items`,
  `get_inventory_status`, `get_table_status`) and two presentation tools (`show_metrics`,
  `show_table`) whose structured JSON is rendered as UI blocks.
- Streams Server-Sent Events: `status`, `text`, `block`, `error`, `done`.
- Without `ANTHROPIC_API_KEY` it runs in **demo mode**: keyword routing over the same tools
  with templated, streamed answers — no key or cost needed.

### Run locally

`npx supabase start --workdir backend` already serves this function (demo mode) at
`http://127.0.0.1:54321/functions/v1/ai-assistant` and reloads it on file changes.

Optional, paid: real model answers. Commands are PowerShell; `Set-Content` writes a plain-text
file (`echo ... >` in Windows PowerShell 5.1 writes UTF-16, which the env-file parser rejects).

```powershell
Set-Content backend/supabase/functions/.env "ANTHROPIC_API_KEY=sk-ant-..."     # git-ignored
Add-Content backend/supabase/functions/.env "ANTHROPIC_MODEL=claude-haiku-4-5"  # optional override
npx supabase functions serve ai-assistant --workdir backend --env-file backend/supabase/functions/.env
```

Tests (no global Deno install needed):

```powershell
cd backend/supabase/functions
$env:DENO_NO_PACKAGE_JSON = '1'
npx --yes deno@2 check ai-assistant/
npx --yes deno@2 test ai-assistant/
```

### Deploy

```bash
npx supabase functions deploy ai-assistant
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```
