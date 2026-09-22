import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Minus,
  Package,
  PackageX,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { InventoryForm } from '@/features/inventory/components/InventoryForm'
import { Pagination } from '@/features/inventory/components/Pagination'
import { StockBadge, StockBar } from '@/features/inventory/components/StockBadge'
import { useInventory, useInventoryMutations, useSuppliers } from '@/features/inventory/hooks/use-inventory'
import { useTableQuery } from '@/features/inventory/hooks/use-table-query'
import {
  STOCK_STATUS_LABELS,
  applyQuery,
  summarize,
  type SortKey,
  type StockFilter,
} from '@/features/inventory/lib/inventory-table'
import type { InventoryItemInput } from '@/features/inventory/types/schemas'
import type { InventoryRow } from '@/types/database'

const qtyFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 })
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export function InventoryPageView() {
  const canWrite = useAuthStore((s) => s.hasPermission('inventory:write'))
  const { data: rows = [], isLoading, isError, error, refetch } = useInventory()
  const { data: suppliers = [] } = useSuppliers()
  const mutations = useInventoryMutations()
  const { query, update, toggleSort, reset, isFiltered, pageSizes } = useTableQuery()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryRow | null>(null)

  const stats = useMemo(() => summarize(rows), [rows])
  const result = useMemo(() => applyQuery(rows, query), [rows, query])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: InventoryRow) {
    setEditing(row)
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleSubmit(values: InventoryItemInput) {
    try {
      if (editing) {
        await mutations.update.mutateAsync({ row: editing, input: values })
        toast.success('Item updated')
      } else {
        await mutations.create.mutateAsync(values)
        toast.success('Item added')
      }
      closeForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function handleDelete(row: InventoryRow) {
    const name = row.ingredients?.name ?? 'this item'
    if (!window.confirm(`Remove ${name} from inventory?`)) return
    try {
      await mutations.remove.mutateAsync(row)
      toast.success(`${name} removed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  function adjust(row: InventoryRow, delta: number) {
    mutations.adjust.mutate(
      { id: row.id, quantity: Number(row.quantity) + delta },
      { onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed') },
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load inventory"
        description={error instanceof Error ? error.message : 'Please try again.'}
        actionLabel="Retry"
        onAction={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Stock levels, reorder points, and suppliers.</p>
        </div>
        {canWrite && !formOpen ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add item
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile label="Tracked items" value={stats.total} icon={Package} onClick={() => update({ status: 'all' })} active={query.status === 'all'} />
        <StatTile label="Low stock" value={stats.low} icon={AlertTriangle} tone="warning" onClick={() => update({ status: 'low' })} active={query.status === 'low'} />
        <StatTile label="Out of stock" value={stats.out} icon={PackageX} tone="destructive" onClick={() => update({ status: 'out' })} active={query.status === 'out'} />
      </div>

      {formOpen ? (
        <InventoryForm
          editing={editing}
          suppliers={suppliers}
          submitting={mutations.create.isPending || mutations.update.isPending}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory yet"
          description="Track ingredients and get warned before you run out."
          actionLabel={canWrite ? 'Add first item' : undefined}
          onAction={canWrite ? openCreate : undefined}
        />
      ) : (
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            {/* Toolbar */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search items or suppliers…"
                  className="pl-9"
                  value={query.search}
                  onChange={(e) => update({ search: e.target.value })}
                  aria-label="Search inventory"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 md:flex">
                <Select
                  className="md:w-40"
                  value={query.status}
                  onChange={(e) => update({ status: e.target.value as StockFilter })}
                  aria-label="Filter by stock status"
                >
                  <option value="all">All statuses</option>
                  <option value="out">{STOCK_STATUS_LABELS.out}</option>
                  <option value="low">{STOCK_STATUS_LABELS.low}</option>
                  <option value="ok">{STOCK_STATUS_LABELS.ok}</option>
                </Select>
                <Select
                  className="md:w-44"
                  value={query.supplierId}
                  onChange={(e) => update({ supplierId: e.target.value })}
                  aria-label="Filter by supplier"
                >
                  <option value="">All suppliers</option>
                  <option value="none">No supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              {isFiltered ? (
                <Button variant="ghost" size="sm" onClick={reset} className="self-start md:self-auto">
                  <X className="h-4 w-4" /> Clear
                </Button>
              ) : null}
            </div>

            {result.total === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                No items match these filters.{' '}
                <button className="font-medium text-primary underline-offset-4 hover:underline" onClick={reset}>
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <SortHeader label="Item" sortKey="name" query={query} onSort={toggleSort} />
                        <SortHeader label="Status" sortKey="status" query={query} onSort={toggleSort} />
                        <SortHeader label="In stock" sortKey="quantity" query={query} onSort={toggleSort} align="right" />
                        <SortHeader label="Reorder at" sortKey="min_quantity" query={query} onSort={toggleSort} align="right" />
                        <SortHeader label="Supplier" sortKey="supplier" query={query} onSort={toggleSort} />
                        <SortHeader label="Updated" sortKey="updated_at" query={query} onSort={toggleSort} />
                        {canWrite ? <th className="w-px py-3 pl-3" aria-label="Actions" /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((row) => (
                        <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                          <td className="py-3 pr-3">
                            <div className="font-medium">{row.ingredients?.name}</div>
                            <StockBar row={row} className="mt-1.5 max-w-[160px]" />
                          </td>
                          <td className="py-3 pr-3">
                            <StockBadge row={row} />
                          </td>
                          <td className="py-3 pr-3 text-right">
                            <QuantityCell row={row} canWrite={canWrite} onAdjust={adjust} />
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums text-muted-foreground">
                            {qtyFormat.format(Number(row.min_quantity))} {row.ingredients?.unit}
                          </td>
                          <td className="py-3 pr-3 text-muted-foreground">{row.suppliers?.name ?? '—'}</td>
                          <td className="py-3 pr-3 text-muted-foreground">{dateFormat.format(new Date(row.updated_at))}</td>
                          {canWrite ? (
                            <td className="py-3 pl-3">
                              <RowActions row={row} onEdit={openEdit} onDelete={handleDelete} />
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <ul className="space-y-2 md:hidden">
                  <li className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Sort</span>
                    <Select
                      className="h-8 w-auto py-0"
                      value={`${query.sortKey}:${query.sortDir}`}
                      onChange={(e) => {
                        const [sortKey, sortDir] = e.target.value.split(':') as [SortKey, 'asc' | 'desc']
                        update({ sortKey, sortDir })
                      }}
                      aria-label="Sort inventory"
                    >
                      <option value="status:asc">Most urgent first</option>
                      <option value="name:asc">Name A–Z</option>
                      <option value="quantity:asc">Lowest stock</option>
                      <option value="quantity:desc">Highest stock</option>
                      <option value="updated_at:desc">Recently updated</option>
                    </Select>
                  </li>
                  {result.items.map((row) => (
                    <li key={row.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{row.ingredients?.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {row.suppliers?.name ?? 'No supplier'} · reorder at{' '}
                            {qtyFormat.format(Number(row.min_quantity))} {row.ingredients?.unit}
                          </div>
                        </div>
                        <StockBadge row={row} />
                      </div>
                      <StockBar row={row} className="my-3" />
                      <div className="flex items-center justify-between">
                        <QuantityCell row={row} canWrite={canWrite} onAdjust={adjust} />
                        {canWrite ? <RowActions row={row} onEdit={openEdit} onDelete={handleDelete} /> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {result.total > 0 ? (
              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                pageSize={query.pageSize}
                total={result.total}
                pageSizes={pageSizes}
                onPageChange={(page) => update({ page })}
                onPageSizeChange={(pageSize) => update({ pageSize })}
              />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string
  value: number
  icon: typeof Package
  tone?: 'warning' | 'destructive'
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4 sm:p-4',
        active && 'border-primary/50 ring-1 ring-primary/30',
      )}
    >
      <div
        className={cn(
          'hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex',
          tone === 'warning' && 'bg-warning/15 text-warning',
          tone === 'destructive' && 'bg-destructive/15 text-destructive',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Icon className={cn('h-3 w-3 sm:hidden', tone === 'warning' && 'text-warning', tone === 'destructive' && 'text-destructive')} />
          {label}
        </div>
      </div>
    </button>
  )
}

function SortHeader({
  label,
  sortKey,
  query,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  query: { sortKey: SortKey; sortDir: 'asc' | 'desc' }
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = query.sortKey === sortKey
  const Icon = !active ? ArrowUpDown : query.sortDir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      className={cn('py-3 pr-3 font-medium', align === 'right' && 'text-right')}
      aria-sort={active ? (query.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon className={cn('h-3 w-3', !active && 'opacity-40')} />
      </button>
    </th>
  )
}

function QuantityCell({
  row,
  canWrite,
  onAdjust,
}: {
  row: InventoryRow
  canWrite: boolean
  onAdjust: (row: InventoryRow, delta: number) => void
}) {
  const value = (
    <span className="font-mono tabular-nums">
      {qtyFormat.format(Number(row.quantity))}{' '}
      <span className="font-sans text-xs text-muted-foreground">{row.ingredients?.unit}</span>
    </span>
  )
  if (!canWrite) return value
  return (
    <div className="inline-flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={Number(row.quantity) <= 0}
        onClick={() => onAdjust(row, -1)}
        aria-label={`Decrease ${row.ingredients?.name}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span className="min-w-[72px] text-center">{value}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onAdjust(row, 1)}
        aria-label={`Increase ${row.ingredients?.name}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function RowActions({
  row,
  onEdit,
  onDelete,
}: {
  row: InventoryRow
  onEdit: (row: InventoryRow) => void
  onDelete: (row: InventoryRow) => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(row)} aria-label={`Edit ${row.ingredients?.name}`}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onDelete(row)} aria-label={`Delete ${row.ingredients?.name}`}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  )
}
