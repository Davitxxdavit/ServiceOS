import { supabase } from '@/lib/supabase'
import type { OrderWithItems, TableStatus, Tables } from '@/types/database'

export async function fetchTables(restaurantId: string) {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .order('position_y')
    .order('position_x')
  if (error) throw error
  return data as Tables<'tables'>[]
}

export async function updateTableStatus(id: string, status: TableStatus) {
  const { data, error } = await supabase.from('tables').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function fetchActiveOrderForTable(restaurantId: string, tableId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('restaurant_id', restaurantId)
    .eq('table_id', tableId)
    .in('status', ['new', 'accepted', 'preparing', 'ready', 'delivered'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as unknown as OrderWithItems | null
}
