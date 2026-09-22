import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { InventoryPageView } from '@/features/inventory/components/InventoryPageView'
import { useAuthStore } from '@/store/auth-store'
import { makeInventoryRow } from '@/test/fixtures'

const farm = { id: '99999999-9999-4999-8999-999999999002', name: 'Adjara Farm' }
const rows = [
  makeInventoryRow({ name: 'Sea Bass', quantity: 4, min_quantity: 8 }),
  makeInventoryRow({ name: 'Lemons', quantity: 0, min_quantity: 3, supplier: farm }),
  makeInventoryRow({ name: 'Flour', quantity: 22, min_quantity: 10 }),
  ...Array.from({ length: 12 }, (_, i) => makeInventoryRow({ name: `Spice ${String(i + 1).padStart(2, '0')}`, quantity: 50, min_quantity: 1 })),
]

const adjust = vi.fn()
vi.mock('@/features/inventory/hooks/use-inventory', () => ({
  useInventory: () => ({ data: rows, isLoading: false, isError: false }),
  useSuppliers: () => ({ data: [farm] }),
  useInventoryMutations: () => ({
    create: { isPending: false, mutateAsync: vi.fn() },
    update: { isPending: false, mutateAsync: vi.fn() },
    remove: { mutateAsync: vi.fn() },
    adjust: { mutate: adjust },
  }),
}))

function renderPage(url = '/inventory') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <InventoryPageView />
    </MemoryRouter>,
  )
}

function tableRows() {
  const table = screen.getByRole('table')
  return within(table).getAllByRole('row').slice(1)
}

beforeEach(() => {
  adjust.mockReset()
  useAuthStore.setState({ permissions: ['inventory:read', 'inventory:write'] })
})

describe('InventoryPageView', () => {
  it('shows summary tiles and the most urgent items first', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /15\s*Tracked items/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\s*Low stock/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\s*Out of stock/ })).toBeInTheDocument()
    expect(tableRows()[0]).toHaveTextContent('Lemons')
    expect(tableRows()[1]).toHaveTextContent('Sea Bass')
  })

  it('paginates 10 rows per page', async () => {
    renderPage()
    expect(tableRows()).toHaveLength(10)
    expect(screen.getByText('1–10 of 15')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(tableRows()).toHaveLength(5)
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
  })

  it('searches and resets to page 1', async () => {
    renderPage('/inventory?page=2')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search inventory' }), 'adjara')
    expect(tableRows()).toHaveLength(1)
    expect(tableRows()[0]).toHaveTextContent('Lemons')
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('filters from the summary tile and clears filters', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Out of stock/ }))
    expect(tableRows()).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(tableRows()).toHaveLength(10)
  })

  it('shows an empty result message when nothing matches', async () => {
    renderPage()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search inventory' }), 'caviar')
    expect(screen.getByText(/No items match these filters/)).toBeInTheDocument()
  })

  it('sorts by column header and toggles direction', async () => {
    renderPage()
    const header = screen.getByRole('button', { name: 'In stock' })
    await userEvent.click(header)
    expect(tableRows()[0]).toHaveTextContent('Lemons')
    await userEvent.click(header)
    expect(screen.getByRole('columnheader', { name: 'In stock' })).toHaveAttribute('aria-sort', 'descending')
    expect(tableRows()[0]).not.toHaveTextContent('Lemons')
  })

  it('restores filters from the URL', () => {
    renderPage('/inventory?status=low')
    expect(tableRows()).toHaveLength(1)
    expect(tableRows()[0]).toHaveTextContent('Sea Bass')
  })

  it('adjusts stock with +/- buttons', async () => {
    renderPage()
    await userEvent.click(screen.getAllByRole('button', { name: 'Increase Sea Bass' })[0]!)
    expect(adjust).toHaveBeenCalledWith({ id: rows[0]!.id, quantity: 5 }, expect.anything())
  })

  it('labels every form field so it is reachable by its visible label', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Add item/ }))
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(screen.getByLabelText('Unit')).toHaveValue('kg')
    expect(screen.getByLabelText('In stock')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Reorder at')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Supplier')).toHaveDisplayValue('No supplier')
  })

  it('hides write actions for read-only roles', () => {
    useAuthStore.setState({ permissions: ['inventory:read'] })
    renderPage()
    expect(screen.queryByRole('button', { name: /Add item/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Increase/ })).not.toBeInTheDocument()
  })
})
