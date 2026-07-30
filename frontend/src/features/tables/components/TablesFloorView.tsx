import { useState } from 'react'
import { Grid3X3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { TABLE_STATUSES, TABLE_STATUS_LABELS, ORDER_STATUS_LABELS } from '@/lib/constants'
import { cn, formatCurrency } from '@/lib/utils'
import type { TableStatus, Tables } from '@/types/database'
import { useActiveOrderForTable, useTables, useUpdateTableStatus } from '@/features/tables/hooks/use-tables'
import { useAuthStore } from '@/store/auth-store'

const statusStyles: Record<TableStatus, string> = {
  available: 'border-success/40 bg-success/10',
  occupied: 'border-accent/40 bg-accent/10',
  reserved: 'border-primary/40 bg-primary/10',
  cleaning: 'border-muted-foreground/30 bg-muted',
}

export function TablesFloorView() {
  const { data: tables, isLoading } = useTables()
  const updateStatus = useUpdateTableStatus()
  const canWrite = useAuthStore((s) => s.hasPermission('tables:write') || s.hasPermission('*'))
  const [selected, setSelected] = useState<Tables<'tables'> | null>(null)
  const { data: activeOrder } = useActiveOrderForTable(selected?.id ?? null)

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  if (!tables?.length) {
    return (
      <EmptyState
        icon={Grid3X3}
        title="No tables configured"
        description="Seed data or create tables to manage the floor."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Floor</h1>
        <p className="text-sm text-muted-foreground">Live table status. Click an occupied table for its order.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABLE_STATUSES.map((status) => (
          <Badge key={status} variant="outline">
            {TABLE_STATUS_LABELS[status]}
          </Badge>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <button
              key={table.id}
              type="button"
              onClick={() => setSelected(table)}
              className={cn(
                'rounded-xl border p-4 text-left transition hover:scale-[1.01]',
                statusStyles[table.status],
                selected?.id === table.id && 'ring-2 ring-ring',
              )}
            >
              <div className="text-lg font-semibold">{table.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">Seats {table.capacity}</div>
              <Badge className="mt-3" variant="secondary">
                {TABLE_STATUS_LABELS[table.status]}
              </Badge>
            </button>
          ))}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{selected ? selected.name : 'Table details'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a table on the floor.</p>
            ) : (
              <>
                {canWrite ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={selected.status}
                      onChange={(e) => {
                        const status = e.target.value as TableStatus
                        void updateStatus
                          .mutateAsync({ id: selected.id, status })
                          .then(() => {
                            setSelected({ ...selected, status })
                            toast.success('Table updated')
                          })
                          .catch((err: unknown) =>
                            toast.error(err instanceof Error ? err.message : 'Update failed'),
                          )
                      }}
                    >
                      {TABLE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {TABLE_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}

                {activeOrder ? (
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Order #{activeOrder.order_number}</div>
                      <Badge>{ORDER_STATUS_LABELS[activeOrder.status]}</Badge>
                    </div>
                    <div className="mt-2 font-mono text-sm tabular-nums">
                      {formatCurrency(Number(activeOrder.total))}
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {activeOrder.order_items?.map((oi) => (
                        <li key={oi.id}>
                          {oi.quantity}× {oi.name}
                        </li>
                      ))}
                    </ul>
                    <Link to={`/orders/${activeOrder.id}`}>
                      <Button className="mt-4 w-full" variant="outline" size="sm">
                        Open order
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active order on this table.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
