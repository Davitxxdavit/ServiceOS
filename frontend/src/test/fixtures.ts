import type { InventoryRow } from '@/types/database'

let seq = 0

export function makeInventoryRow(
  overrides: Partial<Omit<InventoryRow, 'ingredients' | 'suppliers'>> & {
    name?: string
    unit?: string
    supplier?: { id: string; name: string } | null
  } = {},
): InventoryRow {
  seq += 1
  const { name = `Item ${seq}`, unit = 'kg', supplier = null, ...rest } = overrides
  const ingredientId = `ing-${seq}`
  return {
    id: `inv-${seq}`,
    restaurant_id: 'r1',
    ingredient_id: ingredientId,
    quantity: 10,
    min_quantity: 2,
    supplier_id: supplier?.id ?? null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    ...rest,
    ingredients: { id: ingredientId, name, unit },
    suppliers: supplier,
  }
}
