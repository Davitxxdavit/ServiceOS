import { useCallback, useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { applyEvent, toHistory } from '@/features/assistant/lib/chat-reducer'
import { streamAssistant } from '@/features/assistant/services/assistant-service'
import type { ChatMessage } from '@/features/assistant/types/schemas'

const newId = () => crypto.randomUUID()

export function useAssistant() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  const updateMessage = useCallback((id: string, fn: (m: ChatMessage) => ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)))
  }, [])

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || !restaurantId || controllerRef.current) return

      const user: ChatMessage = { id: newId(), role: 'user', content, blocks: [] }
      const reply: ChatMessage = { id: newId(), role: 'assistant', content: '', blocks: [], streaming: true, status: 'Thinking…' }
      const history = toHistory([...messages, user])
      setMessages((prev) => [...prev, user, reply])
      setIsStreaming(true)

      const controller = new AbortController()
      controllerRef.current = controller
      try {
        for await (const event of streamAssistant({ restaurantId, messages: history, signal: controller.signal })) {
          updateMessage(reply.id, (m) => applyEvent(m, event))
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          updateMessage(reply.id, (m) => ({ ...m, error: err instanceof Error ? err.message : 'Something went wrong' }))
        }
      } finally {
        updateMessage(reply.id, (m) => ({ ...m, streaming: false, status: null }))
        controllerRef.current = null
        setIsStreaming(false)
      }
    },
    [messages, restaurantId, updateMessage],
  )

  const stop = useCallback(() => controllerRef.current?.abort(), [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    setMessages([])
  }, [])

  return { messages, isStreaming, send, stop, reset }
}
