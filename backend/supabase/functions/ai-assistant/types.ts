import type { Block } from './tools.ts'

export type AssistantEvent =
  | { type: 'status'; label: string }
  | { type: 'text'; delta: string }
  | { type: 'block'; block: Block }
  | { type: 'error'; message: string }
  | { type: 'done' }

export type Emit = (event: AssistantEvent) => void
