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

```bash
# optional: real model answers
echo "ANTHROPIC_API_KEY=sk-ant-..." > backend/supabase/functions/.env
# optional: override model (default claude-haiku-4-5)
echo "ANTHROPIC_MODEL=claude-haiku-4-5" >> backend/supabase/functions/.env

npx supabase functions serve ai-assistant --workdir backend --env-file backend/supabase/functions/.env
```

### Deploy

```bash
npx supabase functions deploy ai-assistant
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```
