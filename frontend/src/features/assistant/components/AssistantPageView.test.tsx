import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssistantPageView } from '@/features/assistant/components/AssistantPageView'
import { useAuthStore } from '@/store/auth-store'
import type { AssistantEvent } from '@/features/assistant/types/schemas'

const streamAssistant = vi.fn()
vi.mock('@/features/assistant/services/assistant-service', () => ({
  streamAssistant: (...args: unknown[]) => streamAssistant(...args),
}))

async function* events(list: AssistantEvent[]) {
  for (const e of list) {
    await Promise.resolve()
    yield e
  }
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  useAuthStore.setState({ restaurant: { id: 'r1' } as never })
  streamAssistant.mockReset()
})

describe('AssistantPageView', () => {
  it('streams text and renders structured blocks for a suggested question', async () => {
    streamAssistant.mockImplementation(() =>
      events([
        { type: 'status', label: 'Checking inventory…' },
        { type: 'block', block: { kind: 'table', title: 'Reorder list', columns: ['Item', 'Qty'], rows: [['Lemons', 0]] } },
        { type: 'text', delta: '**Lemons** ' },
        { type: 'text', delta: 'are out.' },
        { type: 'done' },
      ]),
    )
    render(<AssistantPageView />)

    await userEvent.click(screen.getByRole('button', { name: 'What do I need to reorder?' }))

    expect(await screen.findByText('are out.', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveTextContent('Lemons')
    expect(screen.getByText('Lemons', { selector: 'strong' })).toBeInTheDocument()
    expect(streamAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 'r1',
        messages: [{ role: 'user', content: 'What do I need to reorder?' }],
      }),
    )
    // input is usable again once the stream is done
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('sends on Enter and shows errors from the service', async () => {
    streamAssistant.mockImplementation(() => {
      throw new Error('Assistant unavailable (500)')
    })
    render(<AssistantPageView />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'Sales today?{Enter}')

    expect(await screen.findByText('Assistant unavailable (500)')).toBeInTheDocument()
    expect(screen.getByText('Sales today?')).toBeInTheDocument()
  })

  it('does not send empty messages', async () => {
    render(<AssistantPageView />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), '   {Enter}')
    expect(streamAssistant).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })
})
