import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeInventoryRow } from '@/test/fixtures'

// Minimal chainable stand-in for `supabase.from(table).update(values, opts).eq(col, val)`
const result = { error: null as { message: string } | null, count: 1 as number | null }
const calls: { table: string; values: unknown; opts: unknown }[] = []

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      update: (values: unknown, opts: unknown) => {
        calls.push({ table, values, opts })
        return { eq: () => Promise.resolve({ ...result }) }
      },
    }),
  },
}))

const { adjustInventoryQuantity, softDeleteInventoryItem, updateInventoryItem } = await import(
  '@/features/inventory/services/inventory-service'
)

beforeEach(() => {
  result.error = null
  result.count = 1
  calls.length = 0
})

describe('inventory-service writes', () => {
  it('requests an exact row count and resolves when a row was written', async () => {
    await expect(adjustInventoryQuantity('inv-1', 3)).resolves.toBeUndefined()
    expect(calls[0]).toMatchObject({ table: 'inventory', values: { quantity: 3 }, opts: { count: 'exact' } })
  })

  it('rejects when RLS silently filtered the update (0 rows)', async () => {
    result.count = 0
    await expect(adjustInventoryQuantity('inv-1', 3)).rejects.toThrow(/not saved/)
    await expect(softDeleteInventoryItem(makeInventoryRow({ name: 'Eggs' }))).rejects.toThrow(/not saved/)
    await expect(
      updateInventoryItem(makeInventoryRow({ name: 'Eggs' }), {
        name: 'Eggs',
        unit: 'unit',
        quantity: 1,
        min_quantity: 1,
        supplier_id: null,
      }),
    ).rejects.toThrow(/not saved/)
  })

  it('still surfaces PostgREST errors', async () => {
    result.error = { message: 'boom' }
    await expect(adjustInventoryQuantity('inv-1', 3)).rejects.toMatchObject({ message: 'boom' })
  })
})
