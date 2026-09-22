// Deterministic "demo mode" used when no ANTHROPIC_API_KEY is configured.
// It routes the question by keyword to the same data tools and streams a
// templated answer, so the streaming UI and structured blocks can be shown
// without an API key or cost.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { TOOL_STATUS, getInventoryStatus, getSalesSummary, getTableStatus, getTopItems, type Period } from './tools.ts'
import type { Emit } from './types.ts'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function streamText(text: string, emit: Emit, signal: AbortSignal) {
  for (const word of text.split(/(\s+)/)) {
    if (signal.aborted) return
    emit({ type: 'text', delta: word })
    await sleep(18)
  }
}

function pickPeriod(q: string): Period {
  if (/month|30|თვ/i.test(q)) return '30d'
  if (/week|7|კვირ/i.test(q)) return '7d'
  return 'today'
}

const PERIOD_LABEL: Record<Period, string> = { today: 'today', '7d': 'in the last 7 days', '30d': 'in the last 30 days' }

export type Topic = 'inventory' | 'top_items' | 'tables' | 'sales'

/** Keyword router. Order matters: stock phrasing ("running low") wins over sales words. */
export function pickTopic(q: string): Topic {
  if (/stock|inventor|reorder|re-order|ingredient|\blow\b|run(ning)? out|short on|მარაგ|საწყობ/i.test(q)) return 'inventory'
  if (/top|best|popular|sell|item|dish|კერძ|გაყიდ/i.test(q)) return 'top_items'
  if (/table|floor|seat|busy|მაგიდ/i.test(q)) return 'tables'
  return 'sales'
}

export async function runDemo(opts: {
  db: SupabaseClient
  restaurantId: string
  currency: string
  question: string
  emit: Emit
  signal: AbortSignal
}) {
  const { db, restaurantId, currency, question, emit, signal } = opts
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency })
  const q = question.toLowerCase()
  const period = pickPeriod(q)
  const topic = pickTopic(q)

  await streamText('_Demo mode — no model key configured, answering from live data with templates._\n\n', emit, signal)

  if (topic === 'inventory') {
    emit({ type: 'status', label: TOOL_STATUS.get_inventory_status })
    const inv = await getInventoryStatus(db, restaurantId)
    const out = inv.needs_attention.filter((i) => i.status === 'out').length
    emit({
      type: 'block',
      block: {
        kind: 'metrics',
        title: 'Stock health',
        items: [
          { label: 'Tracked items', value: String(inv.tracked) },
          { label: 'Low stock', value: String(inv.needs_attention.length - out), tone: 'warning' },
          { label: 'Out of stock', value: String(out), tone: out ? 'bad' : 'good' },
        ],
      },
    })
    if (inv.needs_attention.length) {
      emit({
        type: 'block',
        block: {
          kind: 'table',
          title: 'Reorder list',
          columns: ['Item', 'In stock', 'Reorder at', 'Supplier'],
          rows: inv.needs_attention.slice(0, 10).map((i) => [i.name, `${i.quantity} ${i.unit}`, `${i.reorder_at} ${i.unit}`, i.supplier ?? '—']),
        },
      })
      const first = inv.needs_attention[0]
      await streamText(
        `${inv.needs_attention.length} items need attention. The most urgent is **${first.name}** (${first.quantity} ${first.unit} left, reorder at ${first.reorder_at}). Group orders by supplier to save on delivery.`,
        emit,
        signal,
      )
    } else {
      await streamText('Everything is above its reorder point. Nothing to order right now.', emit, signal)
    }
    return
  }

  if (topic === 'top_items') {
    emit({ type: 'status', label: TOOL_STATUS.get_top_items })
    const top = await getTopItems(db, restaurantId, period, 5)
    if (!top.items.length) {
      await streamText(`No completed sales ${PERIOD_LABEL[period]} yet.`, emit, signal)
      return
    }
    emit({
      type: 'block',
      block: {
        kind: 'table',
        title: `Top items ${PERIOD_LABEL[period]}`,
        columns: ['#', 'Item', 'Sold', 'Revenue'],
        rows: top.items.map((i, n) => [n + 1, i.name, i.quantity, money.format(i.revenue)]),
      },
    })
    await streamText(
      `**${top.items[0].name}** is the best seller ${PERIOD_LABEL[period]} with ${top.items[0].quantity} sold. Make sure its ingredients stay well above the reorder point.`,
      emit,
      signal,
    )
    return
  }

  if (topic === 'tables') {
    emit({ type: 'status', label: TOOL_STATUS.get_table_status })
    const t = await getTableStatus(db, restaurantId)
    emit({
      type: 'block',
      block: {
        kind: 'metrics',
        title: 'Floor right now',
        items: [
          { label: 'Available', value: String(t.counts.available ?? 0), tone: 'good' },
          { label: 'Occupied', value: String(t.counts.occupied ?? 0) },
          { label: 'Reserved', value: String(t.counts.reserved ?? 0) },
          { label: 'Cleaning', value: String(t.counts.cleaning ?? 0), tone: 'warning' },
        ],
      },
    })
    await streamText(`${t.counts.occupied ?? 0} of ${t.total} tables are occupied.`, emit, signal)
    return
  }

  emit({ type: 'status', label: TOOL_STATUS.get_sales_summary })
  const s = await getSalesSummary(db, restaurantId, period)
  emit({
    type: 'block',
    block: {
      kind: 'metrics',
      title: `Sales ${PERIOD_LABEL[period]}`,
      items: [
        { label: 'Revenue', value: money.format(s.revenue), hint: 'Completed & delivered', tone: 'good' },
        { label: 'Orders', value: String(s.orders) },
        { label: 'Avg ticket', value: money.format(s.average_ticket) },
        { label: 'Cancelled', value: String(s.cancelled), tone: s.cancelled ? 'warning' : 'default' },
      ],
    },
  })
  await streamText(
    s.orders
      ? `${s.orders} orders ${PERIOD_LABEL[period]}; ${s.completed} completed for ${money.format(s.revenue)} in revenue. Try asking about top items, stock, or the floor.`
      : `No orders ${PERIOD_LABEL[period]} yet. Try asking about stock or the floor.`,
    emit,
    signal,
  )
}
