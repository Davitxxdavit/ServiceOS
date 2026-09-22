import { deepStrictEqual as assertEquals } from 'node:assert'
import { consumeAnthropicStream } from './anthropic.ts'
import type { AssistantEvent } from './types.ts'

function sse(events: unknown[], chunkSize = 7) {
  const text = events.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join('')
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream<Uint8Array>({
    start(c) {
      // split into small chunks to exercise buffering across boundaries
      for (let i = 0; i < bytes.length; i += chunkSize) c.enqueue(bytes.slice(i, i + chunkSize))
      c.close()
    },
  })
}

Deno.test('streams text and assembles tool_use input from partial JSON', async () => {
  const emitted: AssistantEvent[] = []
  const { content, stopReason } = await consumeAnthropicStream(
    sse([
      { type: 'message_start', message: {} },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Let me ' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'check.' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tu_1', name: 'get_top_items', input: {} } },
      { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"period":' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '"7d","limit":3}' } },
      { type: 'content_block_stop', index: 1 },
      { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
      { type: 'message_stop' },
    ]),
    (e) => emitted.push(e),
  )
  assertEquals(stopReason, 'tool_use')
  assertEquals(emitted, [
    { type: 'text', delta: 'Let me ' },
    { type: 'text', delta: 'check.' },
  ])
  assertEquals(content, [
    { type: 'text', text: 'Let me check.' },
    { type: 'tool_use', id: 'tu_1', name: 'get_top_items', input: { period: '7d', limit: 3 } },
  ])
})

Deno.test('tool_use with no input deltas yields empty object', async () => {
  const { content } = await consumeAnthropicStream(
    sse([
      { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 't', name: 'get_table_status', input: {} } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
    ]),
    () => {},
  )
  assertEquals(content, [{ type: 'tool_use', id: 't', name: 'get_table_status', input: {} }])
})
