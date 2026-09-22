import { deepStrictEqual as assertEquals } from 'node:assert'
import { summarizeSales } from './tools.ts'

Deno.test('summarizeSales counts revenue from completed/delivered orders only, like the dashboard', () => {
  const s = summarizeSales(
    [
      { total: '47.52', status: 'preparing' },
      { total: '66.96', status: 'new' },
      { total: '82.08', status: 'completed' },
      { total: '20.00', status: 'delivered' },
      { total: '15.00', status: 'cancelled' },
    ],
    'today',
  )
  assertEquals(s.orders, 5)
  assertEquals(s.completed, 2)
  assertEquals(s.cancelled, 1)
  assertEquals(s.revenue, 102.08)
  assertEquals(s.average_ticket, 51.04)
})

Deno.test('summarizeSales handles a day with no completed orders', () => {
  const s = summarizeSales([{ total: 10, status: 'new' }], 'today')
  assertEquals(s.revenue, 0)
  assertEquals(s.average_ticket, 0)
})
