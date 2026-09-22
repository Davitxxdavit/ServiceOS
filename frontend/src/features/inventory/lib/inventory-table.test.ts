import { describe, expect, it } from 'vitest'
import { makeInventoryRow } from '@/test/fixtures'
import {
  DEFAULT_QUERY,
  applyQuery,
  filterRows,
  getStockLevel,
  getStockStatus,
  paginate,
  sortRows,
  summarize,
} from '@/features/inventory/lib/inventory-table'

const fish = { id: 's1', name: 'Black Sea Fish Co.' }
const farm = { id: 's2', name: 'Adjara Farm' }

const rows = [
  makeInventoryRow({ name: 'Sea Bass', quantity: 4, min_quantity: 8, supplier: fish, updated_at: '2026-03-02T00:00:00Z' }),
  makeInventoryRow({ name: 'Lemons', quantity: 0, min_quantity: 3, supplier: farm, updated_at: '2026-03-01T00:00:00Z' }),
  makeInventoryRow({ name: 'Flour', quantity: 22, min_quantity: 10, updated_at: '2026-03-03T00:00:00Z' }),
  makeInventoryRow({ name: 'Garlic', quantity: 1, min_quantity: 1, supplier: farm, updated_at: '2026-02-28T00:00:00Z' }),
]

const names = (list: { ingredients: { name: string } | null }[]) => list.map((r) => r.ingredients?.name)

describe('getStockStatus', () => {
  it('is out at zero, low at or below the reorder point, ok above it', () => {
    expect(getStockStatus({ quantity: 0, min_quantity: 5 })).toBe('out')
    expect(getStockStatus({ quantity: 5, min_quantity: 5 })).toBe('low')
    expect(getStockStatus({ quantity: 5.001, min_quantity: 5 })).toBe('ok')
  })

  it('handles numeric strings returned by Postgres numeric columns', () => {
    expect(getStockStatus({ quantity: '3.5' as unknown as number, min_quantity: '4' as unknown as number })).toBe('low')
  })
})

describe('getStockLevel', () => {
  it('is clamped between 0 and 1', () => {
    expect(getStockLevel({ quantity: 100, min_quantity: 2 })).toBe(1)
    expect(getStockLevel({ quantity: 0, min_quantity: 2 })).toBe(0)
    expect(getStockLevel({ quantity: 2, min_quantity: 2 })).toBe(0.5)
  })

  it('treats a zero reorder point as full when anything is in stock', () => {
    expect(getStockLevel({ quantity: 1, min_quantity: 0 })).toBe(1)
  })
})

describe('filterRows', () => {
  it('searches item and supplier names case-insensitively', () => {
    expect(names(filterRows(rows, { search: 'BASS', status: 'all', supplierId: '' }))).toEqual(['Sea Bass'])
    expect(names(filterRows(rows, { search: 'adjara', status: 'all', supplierId: '' }))).toEqual(['Lemons', 'Garlic'])
  })

  it('filters by stock status', () => {
    expect(names(filterRows(rows, { search: '', status: 'low', supplierId: '' }))).toEqual(['Sea Bass', 'Garlic'])
    expect(names(filterRows(rows, { search: '', status: 'out', supplierId: '' }))).toEqual(['Lemons'])
  })

  it('filters by supplier, including items without one', () => {
    expect(names(filterRows(rows, { search: '', status: 'all', supplierId: 's2' }))).toEqual(['Lemons', 'Garlic'])
    expect(names(filterRows(rows, { search: '', status: 'all', supplierId: 'none' }))).toEqual(['Flour'])
  })

  it('combines filters', () => {
    expect(names(filterRows(rows, { search: 'gar', status: 'low', supplierId: 's2' }))).toEqual(['Garlic'])
  })
})

describe('sortRows', () => {
  it('sorts by urgency with name as tie-breaker', () => {
    expect(names(sortRows(rows, 'status', 'asc'))).toEqual(['Lemons', 'Garlic', 'Sea Bass', 'Flour'])
  })

  it('sorts numerically, not lexically', () => {
    expect(names(sortRows(rows, 'quantity', 'desc'))).toEqual(['Flour', 'Sea Bass', 'Garlic', 'Lemons'])
  })

  it('puts items without a supplier last when sorting by supplier', () => {
    expect(names(sortRows(rows, 'supplier', 'asc')).at(-1)).toBe('Flour')
  })

  it('does not mutate the input', () => {
    const copy = [...rows]
    sortRows(rows, 'name', 'desc')
    expect(rows).toEqual(copy)
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 23 }, (_, i) => i)

  it('returns the requested page', () => {
    expect(paginate(items, 3, 10)).toEqual({ items: [20, 21, 22], page: 3, pageCount: 3, total: 23 })
  })

  it('clamps out-of-range pages', () => {
    expect(paginate(items, 99, 10).page).toBe(3)
    expect(paginate(items, 0, 10).page).toBe(1)
  })

  it('reports one page for an empty list', () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pageCount: 1, total: 0 })
  })
})

describe('applyQuery / summarize', () => {
  it('filters, sorts and paginates in one pass', () => {
    const result = applyQuery(rows, { ...DEFAULT_QUERY, status: 'low', sortKey: 'name', pageSize: 1, page: 2 })
    expect(result.total).toBe(2)
    expect(names(result.items)).toEqual(['Sea Bass'])
  })

  it('counts rows by status', () => {
    expect(summarize(rows)).toEqual({ total: 4, low: 2, out: 1, ok: 1 })
  })
})
