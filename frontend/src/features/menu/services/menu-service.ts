import { supabase } from '@/lib/supabase'
import type { CategoryInput, MenuItemInput } from '@/features/menu/types/schemas'
import type { MenuItemWithCategory, Tables } from '@/types/database'

export async function fetchCategories(restaurantId: string) {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .order('sort_order')
  if (error) throw error
  return data as Tables<'menu_categories'>[]
}

export async function createCategory(restaurantId: string, input: CategoryInput) {
  const { data, error } = await supabase
    .from('menu_categories')
    .insert({ ...input, restaurant_id: restaurantId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  const { data, error } = await supabase
    .from('menu_categories')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function softDeleteCategory(id: string) {
  const { error } = await supabase
    .from('menu_categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function fetchMenuItems(restaurantId: string) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as unknown as MenuItemWithCategory[]
}

export async function createMenuItem(restaurantId: string, input: MenuItemInput) {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      description: input.description || null,
      category_id: input.category_id || null,
      price: input.price,
      preparation_time_minutes: input.preparation_time_minutes,
      is_available: input.is_available,
      sort_order: input.sort_order,
      image_url: input.image_url || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMenuItem(id: string, input: Partial<MenuItemInput>) {
  const payload = {
    ...input,
    description: input.description === '' ? null : input.description,
    category_id: input.category_id || null,
    image_url: input.image_url === '' ? null : input.image_url,
  }
  const { data, error } = await supabase.from('menu_items').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteMenuItem(id: string) {
  const { error } = await supabase
    .from('menu_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function uploadMenuImage(restaurantId: string, file: File) {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('menu-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
  return data.publicUrl
}
