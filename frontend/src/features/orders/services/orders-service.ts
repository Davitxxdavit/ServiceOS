import { supabase } from '@/lib/supabase'
import type { CreateOrderInput } from '@/features/orders/types/schemas'
import type { OrderStatus, OrderWithItems } from '@/types/database'

export async function fetchOrders(restaurantId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, tables(name), order_items(*)')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as OrderWithItems[]
}

export async function fetchOrder(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, tables(name), order_items(*)')
    .eq('id', orderId)
    .single()
  if (error) throw error
  return data as unknown as OrderWithItems
}

export async function createOrder(restaurantId: string, employeeId: string | null, input: CreateOrderInput) {
  const menuIds = input.items.map((i) => i.menu_item_id)
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, name, price')
    .in('id', menuIds)
  if (menuError) throw menuError

  const lines = input.items.map((item) => {
    const menu = menuItems?.find((m) => m.id === item.menu_item_id)
    if (!menu) throw new Error('Menu item missing')
    const unit = Number(menu.price)
    return {
      menu_item_id: menu.id,
      name: menu.name,
      quantity: item.quantity,
      unit_price: unit,
      total_price: unit * item.quantity,
    }
  })

  const subtotal = lines.reduce((sum, l) => sum + l.total_price, 0)
  const tax = Math.round(subtotal * 0.08 * 100) / 100
  const total = subtotal + tax

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id: restaurantId,
      table_id: input.table_id || null,
      employee_id: employeeId,
      status: 'new',
      priority: input.priority,
      notes: input.notes || null,
      subtotal,
      tax,
      total,
      order_number: 0,
    })
    .select()
    .single()
  if (orderError) throw orderError

  const { error: itemsError } = await supabase.from('order_items').insert(
    lines.map((l) => ({
      order_id: order.id,
      ...l,
    })),
  )
  if (itemsError) throw itemsError

  if (input.table_id) {
    await supabase.from('tables').update({ status: 'occupied' }).eq('id', input.table_id)
  }

  await supabase.from('activity_logs').insert({
    restaurant_id: restaurantId,
    action: 'order.created',
    entity_type: 'order',
    entity_id: order.id,
    metadata: { order_number: order.order_number },
  })

  return order
}

export async function updateOrderStatus(orderId: string, restaurantId: string, status: OrderStatus) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error

  await supabase.from('activity_logs').insert({
    restaurant_id: restaurantId,
    action: 'order.status_changed',
    entity_type: 'order',
    entity_id: orderId,
    metadata: { to: status },
  })

  if (status === 'completed' && data.table_id) {
    await supabase.from('tables').update({ status: 'cleaning' }).eq('id', data.table_id)
  }

  return data
}
