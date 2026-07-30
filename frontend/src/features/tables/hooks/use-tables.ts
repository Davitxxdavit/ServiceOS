import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import type { TableStatus } from '@/types/database'
import {
  fetchActiveOrderForTable,
  fetchTables,
  updateTableStatus,
} from '@/features/tables/services/tables-service'

export function useTables() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  const qc = useQueryClient()

  useEffect(() => {
    if (!restaurantId) return
    const channel = supabase
      .channel(`tables:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          void qc.invalidateQueries({ queryKey: QUERY_KEYS.tables })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [qc, restaurantId])

  return useQuery({
    queryKey: [...QUERY_KEYS.tables, restaurantId],
    queryFn: () => fetchTables(restaurantId!),
    enabled: Boolean(restaurantId),
  })
}

export function useUpdateTableStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) => updateTableStatus(id, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.tables })
    },
  })
}

export function useActiveOrderForTable(tableId: string | null) {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  return useQuery({
    queryKey: [...QUERY_KEYS.orders, 'table', tableId],
    queryFn: () => fetchActiveOrderForTable(restaurantId!, tableId!),
    enabled: Boolean(restaurantId && tableId),
  })
}
