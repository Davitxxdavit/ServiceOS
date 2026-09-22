import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  STOCK_STATUS_LABELS,
  getStockLevel,
  getStockStatus,
} from '@/features/inventory/lib/inventory-table'
import type { InventoryRow } from '@/types/database'

const VARIANT = { out: 'destructive', low: 'warning', ok: 'success' } as const
const BAR = { out: 'bg-destructive', low: 'bg-warning', ok: 'bg-success' } as const

export function StockBadge({ row }: { row: InventoryRow }) {
  const status = getStockStatus(row)
  return (
    <Badge variant={VARIANT[status]} className="shrink-0 whitespace-nowrap">
      {STOCK_STATUS_LABELS[status]}
    </Badge>
  )
}

export function StockBar({ row, className }: { row: InventoryRow; className?: string }) {
  const status = getStockStatus(row)
  const level = getStockLevel(row)
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level * 100)}
      aria-label="Stock level"
    >
      <div className={cn('h-full rounded-full transition-all', BAR[status])} style={{ width: `${level * 100}%` }} />
    </div>
  )
}
