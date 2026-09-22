import { z } from 'zod'

// Structured output from the model is validated before it reaches the UI.
// Anything that doesn't match is dropped instead of breaking the page.

const tone = z.enum(['default', 'good', 'warning', 'bad']).catch('default')

export const metricsBlockSchema = z.object({
  kind: z.literal('metrics'),
  title: z.string().max(120).optional(),
  items: z
    .array(
      z.object({
        label: z.string().max(60),
        value: z.coerce.string().max(40),
        hint: z.string().max(120).optional(),
        tone: tone.optional(),
      }),
    )
    .min(1)
    .max(4),
})

export const tableBlockSchema = z
  .object({
    kind: z.literal('table'),
    title: z.string().max(120).optional(),
    columns: z.array(z.string().max(40)).min(1).max(6),
    rows: z.array(z.array(z.union([z.string(), z.number()]))).max(20),
  })
  .transform((t) => ({
    ...t,
    // pad/truncate each row to the column count
    rows: t.rows.map((r) => t.columns.map((_, i) => r[i] ?? '')),
  }))

export const blockSchema = z.union([metricsBlockSchema, tableBlockSchema])

export const assistantEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('status'), label: z.string() }),
  z.object({ type: z.literal('text'), delta: z.string() }),
  z.object({ type: z.literal('block'), block: z.unknown() }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('done') }),
])

export type Block = z.output<typeof blockSchema>
export type AssistantEvent = z.infer<typeof assistantEventSchema>

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  blocks: Block[]
  status?: string | null
  error?: string | null
  streaming?: boolean
}
