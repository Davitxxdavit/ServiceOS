import { blockSchema, type AssistantEvent, type ChatMessage } from '@/features/assistant/types/schemas'

/** Applies one streamed event to the assistant message being generated. */
export function applyEvent(message: ChatMessage, event: AssistantEvent): ChatMessage {
  switch (event.type) {
    case 'status':
      return { ...message, status: event.label }
    case 'text':
      return { ...message, status: null, content: message.content + event.delta }
    case 'block': {
      const parsed = blockSchema.safeParse(event.block)
      if (!parsed.success) return message
      return { ...message, status: null, blocks: [...message.blocks, parsed.data] }
    }
    case 'error':
      return { ...message, status: null, error: event.message }
    case 'done':
      return { ...message, status: null, streaming: false }
  }
}

/** Conversation history sent to the model: text only, no empty or failed turns. */
export function toHistory(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.content.trim() && !m.error)
    .map((m) => ({ role: m.role, content: m.content }))
}
