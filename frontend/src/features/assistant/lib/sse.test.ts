import { describe, expect, it } from 'vitest'
import { readSSE } from '@/features/assistant/lib/sse'

function streamOf(text: string, chunkSize = 5) {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize))
      controller.close()
    },
  })
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const out: unknown[] = []
  for await (const e of readSSE(stream)) out.push(e)
  return out
}

describe('readSSE', () => {
  it('parses events split across arbitrary chunk boundaries', async () => {
    const text = 'data: {"type":"text","delta":"Hel"}\n\ndata: {"type":"text","delta":"lo ✓"}\n\ndata: {"type":"done"}\n\n'
    for (const size of [1, 3, 7, 64]) {
      expect(await collect(streamOf(text, size))).toEqual([
        { type: 'text', delta: 'Hel' },
        { type: 'text', delta: 'lo ✓' },
        { type: 'done' },
      ])
    }
  })

  it('handles CRLF line endings and ignores comments / other fields', async () => {
    const text = ': keep-alive\r\n\r\nevent: message\r\nid: 1\r\ndata: {"a":1}\r\n\r\n'
    expect(await collect(streamOf(text, 2))).toEqual([{ a: 1 }])
  })

  it('skips malformed JSON without stopping the stream', async () => {
    const text = 'data: {oops\n\ndata: {"ok":true}\n\n'
    expect(await collect(streamOf(text))).toEqual([{ ok: true }])
  })

  it('ignores a trailing incomplete event', async () => {
    expect(await collect(streamOf('data: {"a":1}\n\ndata: {"b":'))).toEqual([{ a: 1 }])
  })
})
