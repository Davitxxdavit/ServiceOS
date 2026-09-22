import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'

vi.mock('@/features/auth/services/auth-service', () => ({ signOut: vi.fn() }))

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/inventory']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="inventory" element={<p>Inventory page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppLayout mobile drawer', () => {
  it('moves focus into the drawer and returns it to the trigger on Escape', async () => {
    renderLayout()
    const trigger = screen.getByRole('button', { name: 'Open navigation' })
    await userEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Navigation' })
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })
})
