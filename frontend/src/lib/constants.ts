export const APP_NAME = 'ServiceOS'

export const ORDER_STATUSES = [
  'new',
  'accepted',
  'preparing',
  'ready',
  'delivered',
  'completed',
  'cancelled',
] as const

export const KITCHEN_COLUMNS = [
  'new',
  'accepted',
  'preparing',
  'ready',
] as const

export const TABLE_STATUSES = [
  'available',
  'occupied',
  'reserved',
  'cleaning',
] as const

export const ORDER_STATUS_LABELS: Record<(typeof ORDER_STATUSES)[number], string> = {
  new: 'New',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const TABLE_STATUS_LABELS: Record<(typeof TABLE_STATUSES)[number], string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
}

export const QUERY_KEYS = {
  session: ['session'] as const,
  profile: ['profile'] as const,
  restaurant: ['restaurant'] as const,
  menuCategories: ['menu-categories'] as const,
  menuItems: ['menu-items'] as const,
  tables: ['tables'] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  dashboard: ['dashboard'] as const,
  activity: ['activity'] as const,
  notifications: ['notifications'] as const,
  inventory: ['inventory'] as const,
  suppliers: ['suppliers'] as const,
}
