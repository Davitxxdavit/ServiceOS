import { supabase } from '@/lib/supabase'
import { startOfDay, subDays, format } from 'date-fns'

export interface DashboardMetrics {
  todayRevenue: number
  todayOrders: number
  averageOrder: number
  topItems: { name: string; quantity: number }[]
  revenueByHour: { hour: string; revenue: number }[]
  recentActivity: {
    id: string
    action: string
    created_at: string
    metadata: Record<string, unknown>
  }[]
  lowStock: { name: string; quantity: number; min_quantity: number }[]
  reservationSummary: { today: number; upcoming: number }
}

export async function fetchDashboardMetrics(restaurantId: string): Promise<DashboardMetrics> {
  const start = startOfDay(new Date()).toISOString()

  const [
    { data: todayOrders, error: ordersError },
    { data: activity, error: activityError },
    { data: inventory, error: inventoryError },
    { data: reservations, error: reservationsError },
    { data: weekOrders, error: weekError },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, status, created_at, order_items(name, quantity)')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', start)
      .is('deleted_at', null),
    supabase
      .from('activity_logs')
      .select('id, action, created_at, metadata')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('inventory')
      .select('quantity, min_quantity, ingredients(name)')
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null),
    supabase
      .from('reservations')
      .select('id, reserved_at')
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .gte('reserved_at', start),
    supabase
      .from('orders')
      .select('total, created_at, status')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', subDays(new Date(), 1).toISOString())
      .is('deleted_at', null),
  ])

  if (ordersError) throw ordersError
  if (activityError) throw activityError
  if (inventoryError) throw inventoryError
  if (reservationsError) throw reservationsError
  if (weekError) throw weekError

  // Phase 1 revenue from completed/delivered/ready orders totals (payments become SoT in Phase 2/3)
  const revenueOrders = (todayOrders ?? []).filter((o) =>
    ['completed', 'delivered', 'ready', 'preparing', 'accepted', 'new'].includes(o.status),
  )
  const completedLike = (todayOrders ?? []).filter((o) =>
    ['completed', 'delivered'].includes(o.status),
  )
  const todayRevenue = completedLike.reduce((sum, o) => sum + Number(o.total), 0)
  const todayCount = (todayOrders ?? []).length
  const averageOrder = todayCount ? todayRevenue / Math.max(completedLike.length, 1) : 0

  const itemMap = new Map<string, number>()
  for (const order of revenueOrders) {
    const items = (order as { order_items?: { name: string; quantity: number }[] }).order_items ?? []
    for (const item of items) {
      itemMap.set(item.name, (itemMap.get(item.name) ?? 0) + item.quantity)
    }
  }
  const topItems = [...itemMap.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  const hourMap = new Map<string, number>()
  for (let h = 0; h < 24; h++) hourMap.set(h.toString().padStart(2, '0'), 0)
  for (const order of weekOrders ?? []) {
    if (!['completed', 'delivered'].includes(order.status)) continue
    const hour = format(new Date(order.created_at), 'HH')
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + Number(order.total))
  }
  const revenueByHour = [...hourMap.entries()].map(([hour, revenue]) => ({ hour, revenue }))

  const inventoryRows = (inventory ?? []) as unknown as {
    quantity: number
    min_quantity: number
    ingredients: { name: string } | { name: string }[] | null
  }[]

  const lowStock = inventoryRows
    .filter((row) => Number(row.quantity) <= Number(row.min_quantity))
    .map((row) => {
      const ingredient = row.ingredients
      const name = Array.isArray(ingredient)
        ? (ingredient[0]?.name ?? 'Item')
        : (ingredient?.name ?? 'Item')
      return {
        name,
        quantity: Number(row.quantity),
        min_quantity: Number(row.min_quantity),
      }
    })

  const now = new Date()
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  const todayReservations = (reservations ?? []).filter((r) => new Date(r.reserved_at) <= endOfToday)

  return {
    todayRevenue,
    todayOrders: todayCount,
    averageOrder,
    topItems,
    revenueByHour,
    recentActivity:
      activity?.map((a) => ({
        id: a.id,
        action: a.action,
        created_at: a.created_at,
        metadata: (a.metadata ?? {}) as Record<string, unknown>,
      })) ?? [],
    lowStock,
    reservationSummary: {
      today: todayReservations.length,
      upcoming: (reservations ?? []).length,
    },
  }
}
