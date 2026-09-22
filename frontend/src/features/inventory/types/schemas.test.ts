import { describe, expect, it } from 'vitest'
import { inventoryItemSchema } from '@/features/inventory/types/schemas'

describe('inventoryItemSchema', () => {
  it('coerces form strings to numbers and trims text', () => {
    const parsed = inventoryItemSchema.parse({
      name: '  Olive oil ',
      unit: 'L',
      quantity: '4.5',
      min_quantity: '2',
      supplier_id: '',
    })
    expect(parsed).toEqual({ name: 'Olive oil', unit: 'L', quantity: 4.5, min_quantity: 2, supplier_id: null })
  })

  it('rejects negative quantities and empty names', () => {
    const result = inventoryItemSchema.safeParse({ name: ' ', unit: 'kg', quantity: -1, min_quantity: 0 })
    expect(result.success).toBe(false)
    const fields = result.error?.issues.map((i) => i.path[0])
    expect(fields).toEqual(expect.arrayContaining(['name', 'quantity']))
  })

  it('accepts a supplier uuid', () => {
    const id = '99999999-9999-4999-8999-999999999001'
    expect(inventoryItemSchema.parse({ name: 'x', unit: 'kg', quantity: 1, min_quantity: 0, supplier_id: id }).supplier_id).toBe(id)
  })
})
