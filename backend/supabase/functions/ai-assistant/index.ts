// ServiceOS AI assistant — Supabase Edge Function.
//
// POST { restaurantId, messages: [{ role: 'user' | 'assistant', content: string }] }
// Responds with Server-Sent Events, one JSON object per `data:` line:
//   { type: 'status', label }   – a tool is running
//   { type: 'text', delta }     – streamed answer text
//   { type: 'block', block }    – structured UI block (metrics / table)
//   { type: 'error', message }
//   { type: 'done' }
//
// With ANTHROPIC_API_KEY set, Claude answers using tool calling over live data.
// Without it, a deterministic demo mode answers from the same tools so the
// feature still works in local development and public demos.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { TOOL_DEFINITIONS, TOOL_STATUS, runDataTool, toBlock } from './tools.ts'
import { runDemo } from './demo.ts'
import type { Emit } from './types.ts'
import { consumeAnthropicStream, type ContentBlock } from './anthropic.ts'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5'
const MAX_TOOL_ROUNDS = 5
const MAX_HISTORY = 12

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function validMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const out: ChatMessage[] = []
  for (const m of value.slice(-MAX_HISTORY)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null
    const content = m.content.trim().slice(0, 2000)
    if (content) out.push({ role: m.role, content })
  }
  return out.length && out[out.length - 1].role === 'user' ? out : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json(401, { error: 'Missing Authorization header' })

  let body: { restaurantId?: unknown; messages?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }
  const restaurantId = typeof body.restaurantId === 'string' ? body.restaurantId : null
  const messages = validMessages(body.messages)
  if (!restaurantId || !messages) return json(400, { error: 'restaurantId and a user message are required' })

  // Client bound to the caller's JWT → every query goes through RLS.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: isMember, error: memberError } = await db.rpc('is_restaurant_member', {
    p_restaurant_id: restaurantId,
  })
  if (memberError) return json(401, { error: 'Not authenticated' })
  if (!isMember) return json(403, { error: 'You are not a member of this restaurant' })

  const { data: restaurant } = await db
    .from('restaurants')
    .select('name, currency, timezone')
    .eq('id', restaurantId)
    .single()

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit: Emit = (event) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      try {
        const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
        if (apiKey) {
          await runClaude({ apiKey, db, restaurantId, restaurant, messages, emit, signal: req.signal })
        } else {
          await runDemo({ db, restaurantId, currency: restaurant?.currency ?? 'USD', question: messages[messages.length - 1].content, emit, signal: req.signal })
        }
      } catch (err) {
        if (!req.signal.aborted) {
          console.error(err)
          emit({ type: 'error', message: err instanceof Error ? err.message : 'Assistant failed' })
        }
      } finally {
        if (!req.signal.aborted) emit({ type: 'done' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})

// ---------------------------------------------------------------------------
// Claude tool-use loop with streaming
// ---------------------------------------------------------------------------

type ApiMessage = {
  role: 'user' | 'assistant'
  content: string | (ContentBlock | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean })[]
}

async function runClaude(opts: {
  apiKey: string
  db: SupabaseClient
  restaurantId: string
  restaurant: { name: string; currency: string; timezone: string } | null
  messages: ChatMessage[]
  emit: Emit
  signal: AbortSignal
}) {
  const { apiKey, db, restaurantId, restaurant, emit, signal } = opts
  const system = [
    `You are the operations assistant inside ServiceOS for the restaurant "${restaurant?.name ?? 'this restaurant'}".`,
    `Currency: ${restaurant?.currency ?? 'USD'}. Today (UTC): ${new Date().toISOString().slice(0, 10)}.`,
    'Always fetch data with tools before stating numbers; never invent figures.',
    'When the answer is numeric, call show_metrics; when it is a ranked list, call show_table. Then add a short explanation (2-4 sentences) with one practical recommendation.',
    "Reply in the user's language. Be concise. If a question is unrelated to running the restaurant, say what you can help with.",
  ].join('\n')

  const history: ApiMessage[] = opts.messages.map((m) => ({ role: m.role, content: m.content }))

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        tools: TOOL_DEFINITIONS,
        messages: history,
        stream: true,
      }),
    })
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Model request failed (${res.status}) ${detail.slice(0, 200)}`)
    }

    const { content, stopReason } = await consumeAnthropicStream(res.body, emit)
    history.push({ role: 'assistant', content })

    const toolUses = content.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use')
    if (stopReason !== 'tool_use' || toolUses.length === 0) return

    const results = await Promise.all(
      toolUses.map(async (tu) => {
        const block = toBlock(tu.name, tu.input)
        if (block) {
          emit({ type: 'block', block })
          return { type: 'tool_result' as const, tool_use_id: tu.id, content: 'Displayed to the user.' }
        }
        emit({ type: 'status', label: TOOL_STATUS[tu.name] ?? 'Working…' })
        try {
          const data = await runDataTool(db, restaurantId, tu.name, tu.input)
          return { type: 'tool_result' as const, tool_use_id: tu.id, content: JSON.stringify(data) }
        } catch (err) {
          return {
            type: 'tool_result' as const,
            tool_use_id: tu.id,
            content: err instanceof Error ? err.message : 'Tool failed',
            is_error: true,
          }
        }
      }),
    )
    history.push({ role: 'user', content: results })
  }
}
