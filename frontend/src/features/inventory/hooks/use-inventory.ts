import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'
import {
  adjustInventoryQuantity,
  createInventoryItem,
  fetchInventory,
  fetchSuppliers,
  softDeleteInventoryItem,
  updateInventoryItem,
} from '@/features/inventory/services/inventory-service'
import type { InventoryItemInput } from '@/features/inventory/types/schemas'
import type { InventoryRow } from '@/types/database'

export function useInventory() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  return useQuery({
    queryKey: [...QUERY_KEYS.inventory, restaurantId],
    queryFn: () => fetchInventory(restaurantId!),
    enabled: Boolean(restaurantId),
  })
}

export function useSuppliers() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  return useQuery({
    queryKey: [...QUERY_KEYS.suppliers, restaurantId],
    queryFn: () => fetchSuppliers(restaurantId!),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60_000,
  })
}

export function useInventoryMutations() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  const qc = useQueryClient()
  const key = [...QUERY_KEYS.inventory, restaurantId]

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: QUERY_KEYS.inventory }),
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
    ])

  return {
    create: useMutation({
      mutationFn: (input: InventoryItemInput) => createInventoryItem(restaurantId!, input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ row, input }: { row: InventoryRow; input: InventoryItemInput }) =>
        updateInventoryItem(row, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: softDeleteInventoryItem,
      onSuccess: invalidate,
    }),
    /** Optimistic +/- stock adjustment with rollback on error. */
    adjust: useMutation({
      mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
        adjustInventoryQuantity(id, quantity),
      onMutate: async ({ id, quantity }) => {
        await qc.cancelQueries({ queryKey: key })
        const previous = qc.getQueryData<InventoryRow[]>(key)
        qc.setQueryData<InventoryRow[]>(key, (rows) =>
          rows?.map((r) => (r.id === id ? { ...r, quantity: Math.max(0, quantity) } : r)),
        )
        return { previous }
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous) qc.setQueryData(key, ctx.previous)
      },
      onSettled: invalidate,
    }),
  }
}
