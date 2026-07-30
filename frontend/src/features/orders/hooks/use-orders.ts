import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import type { CreateOrderInput } from '@/features/orders/types/schemas'
import type { OrderStatus } from '@/types/database'
import { createOrder, fetchOrder, fetchOrders, updateOrderStatus } from '@/features/orders/services/orders-service'

export function useOrdersRealtime() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  const qc = useQueryClient()

  useEffect(() => {
    if (!restaurantId) return
    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          void qc.invalidateQueries({ queryKey: QUERY_KEYS.orders })
          void qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          void qc.invalidateQueries({ queryKey: QUERY_KEYS.orders })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [qc, restaurantId])
}

export function useOrders() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  useOrdersRealtime()
  return useQuery({
    queryKey: [...QUERY_KEYS.orders, restaurantId],
    queryFn: () => fetchOrders(restaurantId!),
    enabled: Boolean(restaurantId),
  })
}

export function useOrder(orderId: string) {
  useOrdersRealtime()
  return useQuery({
    queryKey: QUERY_KEYS.order(orderId),
    queryFn: () => fetchOrder(orderId),
    enabled: Boolean(orderId),
  })
}

export function useOrderMutations() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  const employeeId = useAuthStore((s) => s.employee?.id ?? null)
  const qc = useQueryClient()

  return {
    create: useMutation({
      mutationFn: (input: CreateOrderInput) => createOrder(restaurantId!, employeeId, input),
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: QUERY_KEYS.orders })
        await qc.invalidateQueries({ queryKey: QUERY_KEYS.tables })
        await qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard })
      },
    }),
    updateStatus: useMutation({
      mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
        updateOrderStatus(orderId, restaurantId!, status),
      onSuccess: async (_data, vars) => {
        await qc.invalidateQueries({ queryKey: QUERY_KEYS.orders })
        await qc.invalidateQueries({ queryKey: QUERY_KEYS.order(vars.orderId) })
        await qc.invalidateQueries({ queryKey: QUERY_KEYS.tables })
        await qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard })
      },
    }),
  }
}
