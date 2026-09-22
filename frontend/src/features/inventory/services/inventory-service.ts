import { supabase } from '@/lib/supabase'
import type { InventoryItemInput } from '@/features/inventory/types/schemas'
import type { InventoryRow, Tables } from '@/types/database'

const INVENTORY_SELECT =
  '*, ingredients!inner(id, name, unit), suppliers(id, name)' as const

export async function fetchInventory(restaurantId: string) {
  const { data, error } = await supabase
    .from('inventory')
    .select(INVENTORY_SELECT)
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .is('ingredients.deleted_at', null)
  if (error) throw error
  return (data ?? []) as unknown as InventoryRow[]
}

export async function fetchSuppliers(restaurantId: string) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .order('name')
  if (error) throw error
  return (data ?? []) as Tables<'suppliers'>[]
}

/**
 * Creates the ingredient and its stock row. If the stock insert fails,
 * the ingredient is soft-deleted so no orphan is left behind.
 */
export async function createInventoryItem(restaurantId: string, input: InventoryItemInput) {
  const { data: ingredient, error: ingredientError } = await supabase
    .from('ingredients')
    .insert({ restaurant_id: restaurantId, name: input.name, unit: input.unit })
    .select('id')
    .single()
  if (ingredientError) throw ingredientError

  const { error } = await supabase.from('inventory').insert({
    restaurant_id: restaurantId,
    ingredient_id: ingredient.id,
    quantity: input.quantity,
    min_quantity: input.min_quantity,
    supplier_id: input.supplier_id,
  })
  if (error) {
    await supabase
      .from('ingredients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', ingredient.id)
    throw error
  }
}

export async function updateInventoryItem(row: InventoryRow, input: InventoryItemInput) {
  const ingredientChanged =
    row.ingredients && (row.ingredients.name !== input.name || row.ingredients.unit !== input.unit)
  if (ingredientChanged) {
    const { error } = await supabase
      .from('ingredients')
      .update({ name: input.name, unit: input.unit })
      .eq('id', row.ingredient_id)
    if (error) throw error
  }
  const { error } = await supabase
    .from('inventory')
    .update({
      quantity: input.quantity,
      min_quantity: input.min_quantity,
      supplier_id: input.supplier_id,
    })
    .eq('id', row.id)
  if (error) throw error
}

export async function adjustInventoryQuantity(id: string, quantity: number) {
  const { error } = await supabase
    .from('inventory')
    .update({ quantity: Math.max(0, quantity) })
    .eq('id', id)
  if (error) throw error
}

export async function softDeleteInventoryItem(row: InventoryRow) {
  const deletedAt = new Date().toISOString()
  const { error } = await supabase.from('inventory').update({ deleted_at: deletedAt }).eq('id', row.id)
  if (error) throw error
  await supabase.from('ingredients').update({ deleted_at: deletedAt }).eq('id', row.ingredient_id)
}
