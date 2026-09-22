import { deepStrictEqual as assertEquals } from 'node:assert'
import { pickTopic } from './demo.ts'

Deno.test('pickTopic routes the suggestion chips', () => {
  assertEquals(pickTopic('How are sales today?'), 'sales')
  assertEquals(pickTopic('What are our best sellers this week?'), 'top_items')
  assertEquals(pickTopic('What do I need to reorder?'), 'inventory')
  assertEquals(pickTopic('How busy is the floor right now?'), 'tables')
})

Deno.test('pickTopic treats "running low" phrasing as inventory, not sales', () => {
  assertEquals(pickTopic('What is running low?'), 'inventory')
  assertEquals(pickTopic('Which items are low?'), 'inventory')
  assertEquals(pickTopic('Are we about to run out of anything?'), 'inventory')
  assertEquals(pickTopic('Show me slow sellers'), 'top_items')
})
