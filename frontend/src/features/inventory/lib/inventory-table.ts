import type { InventoryRow } from '@/types/database'

export type StockStatus = 'out' | 'low' | 'ok'
export type StockFilter = 'all' | StockStatus
export type SortKey = 'name' | 'quantity' | 'min_quantity' | 'status' | 'supplier' | 'updated_at'
export type SortDir = 'asc' | 'desc'

export interface TableQuery {
  search: string
  status: StockFilter
  supplierId: string
  sortKey: SortKey
  sortDir: SortDir
  page: number
  pageSize: number
}

export const DEFAULT_QUERY: TableQuery = {
  search: '',
  status: 'all',
  supplierId: '',
  sortKey: 'status',
  sortDir: 'asc',
  page: 1,
  pageSize: 10,
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  out: 'Out of stock',
  low: 'Low stock',
  ok: 'In stock',
}

const STATUS_RANK: Record<StockStatus, number> = { out: 0, low: 1, ok: 2 }

export function getStockStatus(row: Pick<InventoryRow, 'quantity' | 'min_quantity'>): StockStatus {
  const qty = Number(row.quantity)
  if (qty <= 0) return 'out'
  if (qty <= Number(row.min_quantity)) return 'low'
  return 'ok'
}

/** 0–1 fill ratio relative to twice the minimum, for the stock bar. */
export function getStockLevel(row: Pick<InventoryRow, 'quantity' | 'min_quantity'>): number {
  const min = Number(row.min_quantity)
  const qty = Number(row.quantity)
  if (min <= 0) return qty > 0 ? 1 : 0
  return Math.max(0, Math.min(1, qty / (min * 2)))
}

function sortValue(row: InventoryRow, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return row.ingredients?.name.toLowerCase() ?? ''
    case 'quantity':
      return Number(row.quantity)
    case 'min_quantity':
      return Number(row.min_quantity)
    case 'status':
      return STATUS_RANK[getStockStatus(row)]
    case 'supplier':
      return row.suppliers?.name.toLowerCase() ?? '￿'
    case 'updated_at':
      return row.updated_at
  }
}

export function filterRows(rows: InventoryRow[], q: Pick<TableQuery, 'search' | 'status' | 'supplierId'>) {
  const term = q.search.trim().toLowerCase()
  return rows.filter((row) => {
    if (term) {
      const haystack = `${row.ingredients?.name ?? ''} ${row.suppliers?.name ?? ''}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    if (q.status !== 'all' && getStockStatus(row) !== q.status) return false
    if (q.supplierId === 'none' && row.supplier_id) return false
    if (q.supplierId && q.supplierId !== 'none' && row.supplier_id !== q.supplierId) return false
    return true
  })
}

export function sortRows(rows: InventoryRow[], key: SortKey, dir: SortDir) {
  const factor = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = sortValue(a, key)
    const bv = sortValue(b, key)
    if (av < bv) return -1 * factor
    if (av > bv) return 1 * factor
    // stable tie-breaker: name ascending
    return (a.ingredients?.name ?? '').localeCompare(b.ingredients?.name ?? '')
  })
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * pageSize
  return { items: rows.slice(start, start + pageSize), page: current, pageCount, total: rows.length }
}

export function applyQuery(rows: InventoryRow[], q: TableQuery) {
  return paginate(sortRows(filterRows(rows, q), q.sortKey, q.sortDir), q.page, q.pageSize)
}

export function summarize(rows: InventoryRow[]) {
  let low = 0
  let out = 0
  for (const row of rows) {
    const s = getStockStatus(row)
    if (s === 'low') low += 1
    if (s === 'out') out += 1
  }
  return { total: rows.length, low, out, ok: rows.length - low - out }
}
