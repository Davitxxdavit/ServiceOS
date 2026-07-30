import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'
import {
  createCategory,
  createMenuItem,
  fetchCategories,
  fetchMenuItems,
  softDeleteCategory,
  softDeleteMenuItem,
  updateCategory,
  updateMenuItem,
  uploadMenuImage,
} from '@/features/menu/services/menu-service'
import type { CategoryInput, MenuItemInput } from '@/features/menu/types/schemas'

export function useCategories() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  return useQuery({
    queryKey: [...QUERY_KEYS.menuCategories, restaurantId],
    queryFn: () => fetchCategories(restaurantId!),
    enabled: Boolean(restaurantId),
  })
}

export function useMenuItems() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  return useQuery({
    queryKey: [...QUERY_KEYS.menuItems, restaurantId],
    queryFn: () => fetchMenuItems(restaurantId!),
    enabled: Boolean(restaurantId),
  })
}

export function useMenuMutations() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  const qc = useQueryClient()

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: QUERY_KEYS.menuCategories }),
      qc.invalidateQueries({ queryKey: QUERY_KEYS.menuItems }),
    ])
  }

  return {
    createCategory: useMutation({
      mutationFn: (input: CategoryInput) => createCategory(restaurantId!, input),
      onSuccess: invalidate,
    }),
    updateCategory: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<CategoryInput> }) =>
        updateCategory(id, input),
      onSuccess: invalidate,
    }),
    deleteCategory: useMutation({
      mutationFn: softDeleteCategory,
      onSuccess: invalidate,
    }),
    createItem: useMutation({
      mutationFn: (input: MenuItemInput) => createMenuItem(restaurantId!, input),
      onSuccess: invalidate,
    }),
    updateItem: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<MenuItemInput> }) =>
        updateMenuItem(id, input),
      onSuccess: invalidate,
    }),
    deleteItem: useMutation({
      mutationFn: softDeleteMenuItem,
      onSuccess: invalidate,
    }),
    uploadImage: useMutation({
      mutationFn: (file: File) => uploadMenuImage(restaurantId!, file),
    }),
  }
}
