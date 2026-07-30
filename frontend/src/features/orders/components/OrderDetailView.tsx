import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { useOrder, useOrderMutations } from '@/features/orders/hooks/use-orders'
import { ORDER_TRANSITIONS } from '@/features/orders/types/schemas'
import type { OrderStatus } from '@/types/database'

export function OrderDetailView() {
  const { orderId = '' } = useParams()
  const { data: order, isLoading } = useOrder(orderId)
  const mutations = useOrderMutations()
  const canWrite = useAuthStore(
    (s) => s.hasPermission('orders:write') || s.hasPermission('kitchen:write') || s.hasPermission('*'),
  )

  if (isLoading) return <Skeleton className="h-64" />
  if (!order) return <p className="text-sm text-muted-foreground">Order not found.</p>

  const next = ORDER_TRANSITIONS[order.status]

  async function setStatus(status: OrderStatus) {
    try {
      await mutations.updateStatus.mutateAsync({ orderId: order!.id, status })
      toast.success(`Moved to ${ORDER_STATUS_LABELS[status]}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link to="/orders" className="text-xs text-muted-foreground hover:text-foreground">
            ← Orders
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Order #{order.order_number}</h1>
        </div>
        <Badge>{ORDER_STATUS_LABELS[order.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>Table: {order.tables?.name ?? '—'}</div>
            <div>Priority: {order.priority}</div>
            <div className="font-mono tabular-nums">Subtotal: {formatCurrency(Number(order.subtotal))}</div>
            <div className="font-mono tabular-nums">Tax: {formatCurrency(Number(order.tax))}</div>
            <div className="font-mono text-base font-semibold tabular-nums sm:col-span-2">
              Total: {formatCurrency(Number(order.total))}
            </div>
          </div>
          {order.notes ? <p className="text-sm text-muted-foreground">Notes: {order.notes}</p> : null}
          <ul className="divide-y divide-border rounded-lg border border-border">
            {order.order_items?.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {item.quantity}× {item.name}
                </span>
                <span className="font-mono tabular-nums">{formatCurrency(Number(item.total_price))}</span>
              </li>
            ))}
          </ul>
          {canWrite && next.length ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {next.map((status) => (
                <Button
                  key={status}
                  variant={status === 'cancelled' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => void setStatus(status)}
                >
                  Mark {ORDER_STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
