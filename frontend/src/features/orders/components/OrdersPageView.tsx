import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { useMenuItems } from '@/features/menu/hooks/use-menu'
import { useTables } from '@/features/tables/hooks/use-tables'
import { useOrderMutations, useOrders } from '@/features/orders/hooks/use-orders'
import { orderMetaSchema, type OrderMetaInput } from '@/features/orders/types/schemas'
import type { OrderStatus } from '@/types/database'

function statusVariant(status: OrderStatus) {
  if (status === 'completed') return 'success' as const
  if (status === 'cancelled') return 'destructive' as const
  if (status === 'ready' || status === 'preparing') return 'warning' as const
  if (status === 'new') return 'accent' as const
  return 'default' as const
}

export function OrdersPageView() {
  const { data: orders, isLoading } = useOrders()
  const { data: menuItems } = useMenuItems()
  const { data: tables } = useTables()
  const mutations = useOrderMutations()
  const canWrite = useAuthStore((s) => s.hasPermission('orders:write') || s.hasPermission('*'))
  const [showForm, setShowForm] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})

  const form = useForm<OrderMetaInput>({
    resolver: zodResolver(orderMetaSchema),
    defaultValues: { table_id: '', notes: '', priority: 0 },
  })

  const lineItems = useMemo(
    () =>
      Object.entries(selectedItems)
        .filter(([, qty]) => qty > 0)
        .map(([menu_item_id, quantity]) => ({ menu_item_id, quantity })),
    [selectedItems],
  )

  async function onCreate(values: OrderMetaInput) {
    if (!lineItems.length) {
      toast.error('Add at least one item')
      return
    }
    try {
      await mutations.create.mutateAsync({
        table_id: values.table_id || undefined,
        notes: values.notes,
        priority: values.priority,
        items: lineItems,
      })
      toast.success('Order created')
      setShowForm(false)
      setSelectedItems({})
      form.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Create failed')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">Realtime ticket list with full status lifecycle.</p>
        </div>
        {canWrite ? (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> New order
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Create order</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit(onCreate)}>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Table</Label>
                  <Select {...form.register('table_id')}>
                    <option value="">Walk-in / none</option>
                    {tables?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Input type="number" min={0} max={5} {...form.register('priority')} />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>Notes</Label>
                  <Textarea {...form.register('notes')} />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {menuItems
                  ?.filter((m) => m.is_available)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatCurrency(Number(item.price))}
                        </div>
                      </div>
                      <Input
                        className="w-20"
                        type="number"
                        min={0}
                        value={selectedItems[item.id] ?? 0}
                        onChange={(e) =>
                          setSelectedItems((prev) => ({
                            ...prev,
                            [item.id]: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  ))}
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {!orders?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders yet"
          description="Create an order from the menu to populate the kitchen board."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Items</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-border/70 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      #{order.order_number}
                    </Link>
                    {order.priority > 0 ? (
                      <Badge className="ml-2" variant="accent">
                        P{order.priority}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{order.tables?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(order.status)}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatCurrency(Number(order.total))}</td>
                  <td className="px-4 py-3 text-muted-foreground">{order.order_items?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
