import { supabase } from '@/lib/supabase'
import { readSSE } from '@/features/assistant/lib/sse'
import { assistantEventSchema, type AssistantEvent } from '@/features/assistant/types/schemas'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321'}/functions/v1/ai-assistant`

export async function* streamAssistant(params: {
  restaurantId: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  signal: AbortSignal
}): AsyncGenerator<AssistantEvent> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Your session expired. Please sign in again.')

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    signal: params.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify({ restaurantId: params.restaurantId, messages: params.messages }),
  })

  if (!res.ok || !res.body) {
    let message = `Assistant unavailable (${res.status})`
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      message = body.error ?? body.message ?? message
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message)
  }

  for await (const raw of readSSE(res.body)) {
    const parsed = assistantEventSchema.safeParse(raw)
    if (parsed.success) yield parsed.data
  }
}
