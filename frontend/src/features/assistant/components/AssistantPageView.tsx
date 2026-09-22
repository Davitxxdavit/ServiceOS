import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { AlertCircle, ArrowUp, Loader2, RotateCcw, Sparkles, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { BlockView } from '@/features/assistant/components/BlockView'
import { RichText } from '@/features/assistant/components/RichText'
import { useAssistant } from '@/features/assistant/hooks/use-assistant'
import type { ChatMessage } from '@/features/assistant/types/schemas'

const SUGGESTIONS = [
  'How are sales today?',
  'What are our best sellers this week?',
  'What do I need to reorder?',
  'How busy is the floor right now?',
]

export function AssistantPageView() {
  const { messages, isStreaming, send, stop, reset } = useAssistant()
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const last = messages[messages.length - 1]
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, last?.content, last?.blocks.length])

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!input.trim() || isStreaming) return
    void send(input)
    setInput('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-4xl flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" /> Assistant
          </h1>
          <p className="text-sm text-muted-foreground">Ask about sales, menu performance, stock, or the floor.</p>
        </div>
        {messages.length ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> New chat
          </Button>
        ) : null}
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6" aria-live="polite" aria-busy={isStreaming}>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">What would you like to know?</p>
                <p className="text-sm text-muted-foreground">Answers use live data from your restaurant.</p>
              </div>
              <div className="flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageView key={m.id} message={m} />)
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="border-t border-border p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask anything about today's service…"
              rows={1}
              maxLength={2000}
              className="max-h-40 min-h-10 resize-none"
              aria-label="Message"
            />
            {isStreaming ? (
              <Button type="button" variant="outline" size="icon" onClick={stop} aria-label="Stop generating">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Read-only: the assistant can look at data but never changes it.
          </p>
        </form>
      </Card>
    </div>
  )
}

function MessageView({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  const empty = !message.content && message.blocks.length === 0
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {message.blocks.map((b, i) => (
          <BlockView key={i} block={b} />
        ))}
        {message.content ? (
          <div className="text-sm leading-relaxed">
            <RichText text={message.content} />
            {message.streaming ? <span className="streaming-caret" aria-hidden>▍</span> : null}
          </div>
        ) : null}
        {message.status || (message.streaming && empty) ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {message.status ?? 'Thinking…'}
          </div>
        ) : null}
        {message.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {message.error}
          </div>
        ) : null}
        {!message.streaming && empty && !message.error ? (
          <p className="text-sm text-muted-foreground">Stopped.</p>
        ) : null}
      </div>
    </div>
  )
}
