import { lazy } from 'react'

// Each app page is its own chunk, so the login screen doesn't download
// the kitchen board, charts, or drag-and-drop code.
export const DashboardPage = lazy(() =>
  import('@/features/dashboard/components/DashboardView').then((m) => ({ default: m.DashboardView })),
)
export const OrdersPage = lazy(() =>
  import('@/features/orders/components/OrdersPageView').then((m) => ({ default: m.OrdersPageView })),
)
export const OrderDetailPage = lazy(() =>
  import('@/features/orders/components/OrderDetailView').then((m) => ({ default: m.OrderDetailView })),
)
export const KitchenPage = lazy(() =>
  import('@/features/kitchen/components/KitchenBoardView').then((m) => ({ default: m.KitchenBoardView })),
)
export const TablesPage = lazy(() =>
  import('@/features/tables/components/TablesFloorView').then((m) => ({ default: m.TablesFloorView })),
)
export const MenuPage = lazy(() =>
  import('@/features/menu/components/MenuPageView').then((m) => ({ default: m.MenuPageView })),
)
export const InventoryPage = lazy(() =>
  import('@/features/inventory/components/InventoryPageView').then((m) => ({ default: m.InventoryPageView })),
)
export const AssistantPage = lazy(() =>
  import('@/features/assistant/components/AssistantPageView').then((m) => ({ default: m.AssistantPageView })),
)
