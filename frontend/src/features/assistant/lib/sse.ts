/**
 * Reads a Server-Sent Events stream and yields the parsed JSON payload of
 * every `data:` event. Handles events split across network chunks and
 * multi-line `data:` fields.
 */
export async function* readSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n')
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const data = raw
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, ''))
          .join('\n')
        if (!data) continue
        try {
          yield JSON.parse(data)
        } catch {
          // ignore malformed event
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
