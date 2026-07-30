import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'
import { useAuthStore } from '@/store/auth-store'
import { fetchDashboardMetrics } from '@/features/dashboard/services/dashboard-service'
import { useOrdersRealtime } from '@/features/orders/hooks/use-orders'

export function useDashboard() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  useOrdersRealtime()
  return useQuery({
    queryKey: [...QUERY_KEYS.dashboard, restaurantId],
    queryFn: () => fetchDashboardMetrics(restaurantId!),
    enabled: Boolean(restaurantId),
  })
}
