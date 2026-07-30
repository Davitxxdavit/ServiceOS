import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CookingPot } from 'lucide-react'
import toast from 'react-hot-toast'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { KITCHEN_COLUMNS, ORDER_STATUS_LABELS } from '@/lib/constants'
import { cn, formatDuration } from '@/lib/utils'
import { useOrders, useOrderMutations } from '@/features/orders/hooks/use-orders'
import type { OrderStatus, OrderWithItems } from '@/types/database'

type OrderRow = OrderWithItems

function useCookingSeconds(startedAt: string | null | undefined) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!startedAt) {
      setSeconds(0)
      return
    }
    const tick = () => {
      setSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAt])
  return seconds
}

function KitchenCard({ order, dragging }: { order: OrderRow; dragging?: boolean }) {
  const started = order.preparing_at ?? order.accepted_at ?? order.created_at
  const seconds = useCookingSeconds(started)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { status: order.status },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm active:cursor-grabbing',
        (isDragging || dragging) && 'opacity-60',
        order.priority > 0 && 'border-accent/50',
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">#{order.order_number}</div>
        {order.priority > 0 ? <Badge variant="accent">Priority {order.priority}</Badge> : null}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{order.tables?.name ?? 'No table'}</div>
      <div className="mt-2 font-mono text-sm tabular-nums text-primary">{formatDuration(seconds)}</div>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {order.order_items?.slice(0, 4).map((item) => (
          <li key={item.id}>
            {item.quantity}× {item.name}
          </li>
        ))}
      </ul>
      {order.notes ? <p className="mt-2 text-xs text-warning">Note: {order.notes}</p> : null}
    </div>
  )
}

function Column({ id, title, orders }: { id: string; title: string; orders: OrderRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[70vh] flex-col rounded-2xl border border-border/70 bg-muted/20 p-3',
        isOver && 'ring-2 ring-primary/40',
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        <Badge variant="secondary">{orders.length}</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {orders.map((order) => (
          <KitchenCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}

export function KitchenBoardView() {
  const { data: orders, isLoading } = useOrders()
  const mutations = useOrderMutations()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const kitchenOrders = useMemo(
    () =>
      (orders ?? []).filter((o) =>
        (KITCHEN_COLUMNS as readonly string[]).includes(o.status),
      ),
    [orders],
  )

  const byColumn = useMemo(() => {
    const map: Record<string, OrderRow[]> = {}
    for (const col of KITCHEN_COLUMNS) map[col] = []
    for (const order of kitchenOrders) {
      map[order.status]?.push(order)
    }
    for (const col of KITCHEN_COLUMNS) {
      map[col]?.sort((a, b) => b.priority - a.priority || a.created_at.localeCompare(b.created_at))
    }
    return map
  }, [kitchenOrders])

  const activeOrder = kitchenOrders.find((o) => o.id === activeId) ?? null

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const overId = event.over?.id
    if (!overId) return
    const nextStatus = String(overId) as OrderStatus
    if (!(KITCHEN_COLUMNS as readonly string[]).includes(nextStatus)) return
    const order = kitchenOrders.find((o) => o.id === event.active.id)
    if (!order || order.status === nextStatus) return
    try {
      await mutations.updateStatus.mutateAsync({ orderId: order.id, status: nextStatus })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not move ticket')
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[70vh]" />
        ))}
      </div>
    )
  }

  if (!kitchenOrders.length) {
    return (
      <EmptyState
        icon={CookingPot}
        title="Kitchen is clear"
        description="New tickets will appear here in realtime."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kitchen Display</h1>
        <p className="text-sm text-muted-foreground">Drag tickets across stations. Timers start on accept/prep.</p>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={(e) => void onDragEnd(e)}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {KITCHEN_COLUMNS.map((col) => (
            <Column
              key={col}
              id={col}
              title={ORDER_STATUS_LABELS[col]}
              orders={byColumn[col] ?? []}
            />
          ))}
        </div>
        <DragOverlay>{activeOrder ? <KitchenCard order={activeOrder} dragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
