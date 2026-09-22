import { describe, expect, it } from 'vitest'
import { applyEvent, toHistory } from '@/features/assistant/lib/chat-reducer'
import type { ChatMessage } from '@/features/assistant/types/schemas'

const empty = (): ChatMessage => ({ id: 'a', role: 'assistant', content: '', blocks: [], streaming: true, status: 'Thinking…' })

describe('applyEvent', () => {
  it('appends text deltas and clears the status line', () => {
    let m = empty()
    m = applyEvent(m, { type: 'status', label: 'Checking inventory…' })
    expect(m.status).toBe('Checking inventory…')
    m = applyEvent(m, { type: 'text', delta: 'Two items ' })
    m = applyEvent(m, { type: 'text', delta: 'are low.' })
    expect(m.content).toBe('Two items are low.')
    expect(m.status).toBeNull()
  })

  it('adds valid structured blocks', () => {
    const m = applyEvent(empty(), {
      type: 'block',
      block: { kind: 'metrics', items: [{ label: 'Revenue', value: 1240.5, tone: 'good' }] },
    })
    expect(m.blocks).toEqual([{ kind: 'metrics', items: [{ label: 'Revenue', value: '1240.5', tone: 'good' }] }])
  })

  it('drops blocks that do not match the schema', () => {
    const bad = [
      { kind: 'chart', data: [] },
      { kind: 'metrics', items: [] },
      { kind: 'table', columns: [], rows: [] },
      'not an object',
    ]
    for (const block of bad) {
      expect(applyEvent(empty(), { type: 'block', block }).blocks).toEqual([])
    }
  })

  it('normalises table rows to the column count and unknown tones to default', () => {
    const m = applyEvent(empty(), {
      type: 'block',
      block: { kind: 'table', columns: ['Item', 'Qty'], rows: [['Fish'], ['Lemons', 3, 'extra']] },
    })
    expect(m.blocks[0]).toMatchObject({ rows: [['Fish', ''], ['Lemons', 3]] })

    const t = applyEvent(empty(), {
      type: 'block',
      block: { kind: 'metrics', items: [{ label: 'x', value: '1', tone: 'neon' }] },
    })
    expect(t.blocks[0]).toMatchObject({ items: [{ tone: 'default' }] })
  })

  it('marks the message finished on done and records errors', () => {
    expect(applyEvent(empty(), { type: 'done' }).streaming).toBe(false)
    expect(applyEvent(empty(), { type: 'error', message: 'Rate limited' }).error).toBe('Rate limited')
  })
})

describe('toHistory', () => {
  it('keeps only non-empty, successful turns as plain text', () => {
    const history = toHistory([
      { id: '1', role: 'user', content: 'Sales today?', blocks: [] },
      { id: '2', role: 'assistant', content: '', blocks: [], error: 'Network error' },
      { id: '3', role: 'user', content: 'Try again', blocks: [] },
      { id: '4', role: 'assistant', content: 'Revenue is $900.', blocks: [{ kind: 'metrics', items: [{ label: 'a', value: 'b' }] }] },
    ])
    expect(history).toEqual([
      { role: 'user', content: 'Sales today?' },
      { role: 'user', content: 'Try again' },
      { role: 'assistant', content: 'Revenue is $900.' },
    ])
  })
})
