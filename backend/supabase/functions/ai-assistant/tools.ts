// Data + presentation tools the assistant can call.
// Every query runs with the caller's JWT, so Postgres RLS decides what is visible.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type Period = 'today' | '7d' | '30d'

export type Block =
  | {
      kind: 'metrics'
      title?: string
      items: { label: string; value: string; hint?: string; tone?: 'default' | 'good' | 'warning' | 'bad' }[]
    }
  | { kind: 'table'; title?: string; columns: string[]; rows: (string | number)[][] }

function periodStart(period: Period): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  if (period === '7d') d.setUTCDate(d.getUTCDate() - 6)
  if (period === '30d') d.setUTCDate(d.getUTCDate() - 29)
  return d.toISOString()
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Same definition as the dashboard: only completed/delivered orders count as revenue. */
const REVENUE_STATUSES = ['completed', 'delivered']

export function summarizeSales(rows: { total: number | string; status: string }[], period: Period) {
  const paid = rows.filter((o) => REVENUE_STATUSES.includes(o.status))
  const revenue = paid.reduce((s, o) => s + Number(o.total), 0)
  const byStatus: Record<string, number> = {}
  for (const o of rows) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
  return {
    period,
    orders: rows.length,
    completed: paid.length,
    cancelled: byStatus.cancelled ?? 0,
    revenue: round2(revenue),
    average_ticket: paid.length ? round2(revenue / paid.length) : 0,
    by_status: byStatus,
  }
}

export async function getSalesSummary(db: SupabaseClient, restaurantId: string, period: Period) {
  const { data, error } = await db
    .from('orders')
    .select('total, status')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .gte('created_at', periodStart(period))
  if (error) throw error
  return summarizeSales(data ?? [], period)
}

export async function getTopItems(db: SupabaseClient, restaurantId: string, period: Period, limit = 5) {
  const { data, error } = await db
    .from('orders')
    .select('status, order_items(name, quantity, total_price)')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('created_at', periodStart(period))
  if (error) throw error
  const agg = new Map<string, { name: string; quantity: number; revenue: number }>()
  for (const order of data ?? []) {
    for (const item of (order.order_items ?? []) as { name: string; quantity: number; total_price: number }[]) {
      const cur = agg.get(item.name) ?? { name: item.name, quantity: 0, revenue: 0 }
      cur.quantity += item.quantity
      cur.revenue = round2(cur.revenue + Number(item.total_price))
      agg.set(item.name, cur)
    }
  }
  return {
    period,
    items: [...agg.values()].sort((a, b) => b.quantity - a.quantity).slice(0, Math.min(Math.max(limit, 1), 20)),
  }
}

export async function getInventoryStatus(db: SupabaseClient, restaurantId: string) {
  const { data, error } = await db
    .from('inventory')
    .select('quantity, min_quantity, ingredients!inner(name, unit), suppliers(name)')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
  if (error) throw error
  const rows = (data ?? []).map((r) => {
    const ing = r.ingredients as unknown as { name: string; unit: string }
    const sup = r.suppliers as unknown as { name: string } | null
    const qty = Number(r.quantity)
    const min = Number(r.min_quantity)
    return {
      name: ing.name,
      unit: ing.unit,
      quantity: qty,
      reorder_at: min,
      supplier: sup?.name ?? null,
      status: qty <= 0 ? 'out' : qty <= min ? 'low' : 'ok',
    }
  })
  return {
    tracked: rows.length,
    needs_attention: rows.filter((r) => r.status !== 'ok').sort((a, b) => a.quantity / (a.reorder_at || 1) - b.quantity / (b.reorder_at || 1)),
  }
}

export async function getTableStatus(db: SupabaseClient, restaurantId: string) {
  const { data, error } = await db
    .from('tables')
    .select('name, capacity, status')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .order('name')
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const t of data ?? []) counts[t.status] = (counts[t.status] ?? 0) + 1
  return { total: data?.length ?? 0, counts, tables: data ?? [] }
}

const PERIOD_SCHEMA = {
  type: 'string',
  enum: ['today', '7d', '30d'],
  description: "Time window. 'today' = since midnight UTC, '7d' / '30d' include today.",
}

const TONE = { type: 'string', enum: ['default', 'good', 'warning', 'bad'] }

/** Tool definitions in Anthropic Messages API format. */
export const TOOL_DEFINITIONS = [
  {
    name: 'get_sales_summary',
    description:
      'Order count (all statuses), revenue and average ticket (completed/delivered orders only), and status breakdown for a period.',
    input_schema: { type: 'object', properties: { period: PERIOD_SCHEMA }, required: ['period'] },
  },
  {
    name: 'get_top_items',
    description: 'Best-selling menu items by quantity for a period (cancelled orders excluded).',
    input_schema: {
      type: 'object',
      properties: { period: PERIOD_SCHEMA, limit: { type: 'integer', minimum: 1, maximum: 20 } },
      required: ['period'],
    },
  },
  {
    name: 'get_inventory_status',
    description: 'Ingredients that are low or out of stock, most urgent first, with supplier.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_table_status',
    description: 'Current floor status: how many tables are available, occupied, reserved or being cleaned.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'show_metrics',
    description:
      'Display 2-4 key numbers as metric cards in the UI. Use after fetching data when numbers are the answer. Values must be pre-formatted strings (e.g. "$1,240.50").',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          items: {
            type: 'object',
            properties: { label: { type: 'string' }, value: { type: 'string' }, hint: { type: 'string' }, tone: TONE },
            required: ['label', 'value'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'show_table',
    description: 'Display a small table (max 10 rows) in the UI, e.g. top items or items to reorder.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        columns: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
        rows: {
          type: 'array',
          maxItems: 10,
          items: { type: 'array', items: { type: ['string', 'number'] } },
        },
      },
      required: ['columns', 'rows'],
    },
  },
] as const

export type ToolName = (typeof TOOL_DEFINITIONS)[number]['name']

export async function runDataTool(
  db: SupabaseClient,
  restaurantId: string,
  name: string,
  input: Record<string, unknown>,
) {
  const period = (['today', '7d', '30d'].includes(String(input.period)) ? input.period : 'today') as Period
  switch (name) {
    case 'get_sales_summary':
      return getSalesSummary(db, restaurantId, period)
    case 'get_top_items':
      return getTopItems(db, restaurantId, period, Number(input.limit) || 5)
    case 'get_inventory_status':
      return getInventoryStatus(db, restaurantId)
    case 'get_table_status':
      return getTableStatus(db, restaurantId)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

export function toBlock(name: string, input: Record<string, unknown>): Block | null {
  if (name === 'show_metrics') return { kind: 'metrics', ...(input as Omit<Extract<Block, { kind: 'metrics' }>, 'kind'>) }
  if (name === 'show_table') return { kind: 'table', ...(input as Omit<Extract<Block, { kind: 'table' }>, 'kind'>) }
  return null
}

export const TOOL_STATUS: Record<string, string> = {
  get_sales_summary: 'Reading sales…',
  get_top_items: 'Ranking menu items…',
  get_inventory_status: 'Checking inventory…',
  get_table_status: 'Looking at the floor…',
}
