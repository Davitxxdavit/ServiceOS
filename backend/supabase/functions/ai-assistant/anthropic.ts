// Parser for the Anthropic Messages API streaming format.
import type { Emit } from './types.ts'

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

/** Parses Anthropic's SSE stream, forwarding text deltas and collecting content blocks. */
export async function consumeAnthropicStream(body: ReadableStream<Uint8Array>, emit: Emit) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  const blocks: (ContentBlock & { _json?: string })[] = []
  let stopReason: string | null = null
  let buffer = ''

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const dataLine = raw.split('\n').find((l) => l.startsWith('data:'))
      if (!dataLine) continue
      const evt = JSON.parse(dataLine.slice(5).trim())
      switch (evt.type) {
        case 'content_block_start':
          blocks[evt.index] =
            evt.content_block.type === 'tool_use'
              ? { type: 'tool_use', id: evt.content_block.id, name: evt.content_block.name, input: {}, _json: '' }
              : { type: 'text', text: '' }
          break
        case 'content_block_delta': {
          const block = blocks[evt.index]
          if (evt.delta.type === 'text_delta' && block?.type === 'text') {
            block.text += evt.delta.text
            emit({ type: 'text', delta: evt.delta.text })
          } else if (evt.delta.type === 'input_json_delta' && block?.type === 'tool_use') {
            block._json += evt.delta.partial_json
          }
          break
        }
        case 'content_block_stop': {
          const block = blocks[evt.index]
          if (block?.type === 'tool_use') {
            block.input = block._json ? JSON.parse(block._json) : {}
            delete block._json
          }
          break
        }
        case 'message_delta':
          stopReason = evt.delta?.stop_reason ?? stopReason
          break
        case 'error':
          throw new Error(evt.error?.message ?? 'Model stream error')
      }
    }
  }
  return { content: blocks.filter(Boolean).filter((b) => b.type !== 'text' || b.text) as ContentBlock[], stopReason }
}
