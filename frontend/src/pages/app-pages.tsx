import { DashboardView } from '@/features/dashboard/components/DashboardView'
import { OrdersPageView } from '@/features/orders/components/OrdersPageView'
import { OrderDetailView } from '@/features/orders/components/OrderDetailView'
import { KitchenBoardView } from '@/features/kitchen/components/KitchenBoardView'
import { TablesFloorView } from '@/features/tables/components/TablesFloorView'
import { MenuPageView } from '@/features/menu/components/MenuPageView'

export function DashboardPage() {
  return <DashboardView />
}

export function OrdersPage() {
  return <OrdersPageView />
}

export function OrderDetailPage() {
  return <OrderDetailView />
}

export function KitchenPage() {
  return <KitchenBoardView />
}

export function TablesPage() {
  return <TablesFloorView />
}

export function MenuPage() {
  return <MenuPageView />
}
