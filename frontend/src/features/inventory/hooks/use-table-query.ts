import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DEFAULT_QUERY,
  type SortDir,
  type SortKey,
  type StockFilter,
  type TableQuery,
} from '@/features/inventory/lib/inventory-table'

const SORT_KEYS: SortKey[] = ['name', 'quantity', 'min_quantity', 'status', 'supplier', 'updated_at']
const STATUSES: StockFilter[] = ['all', 'out', 'low', 'ok']
const PAGE_SIZES = [10, 25, 50]

/** Table state lives in the URL so filtered views can be bookmarked and shared. */
export function useTableQuery() {
  const [params, setParams] = useSearchParams()

  const query: TableQuery = useMemo(() => {
    const sortKey = params.get('sort') as SortKey | null
    const status = params.get('status') as StockFilter | null
    const pageSize = Number(params.get('size'))
    return {
      search: params.get('q') ?? DEFAULT_QUERY.search,
      status: status && STATUSES.includes(status) ? status : DEFAULT_QUERY.status,
      supplierId: params.get('supplier') ?? DEFAULT_QUERY.supplierId,
      sortKey: sortKey && SORT_KEYS.includes(sortKey) ? sortKey : DEFAULT_QUERY.sortKey,
      sortDir: params.get('dir') === 'desc' ? 'desc' : 'asc',
      page: Math.max(1, Number(params.get('page')) || 1),
      pageSize: PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_QUERY.pageSize,
    }
  }, [params])

  const update = useCallback(
    (patch: Partial<TableQuery>) => {
      const next = { ...query, ...patch }
      // Any change other than paging resets to page 1
      if (!('page' in patch)) next.page = 1
      const out = new URLSearchParams()
      if (next.search) out.set('q', next.search)
      if (next.status !== DEFAULT_QUERY.status) out.set('status', next.status)
      if (next.supplierId) out.set('supplier', next.supplierId)
      if (next.sortKey !== DEFAULT_QUERY.sortKey) out.set('sort', next.sortKey)
      if (next.sortDir !== DEFAULT_QUERY.sortDir) out.set('dir', next.sortDir)
      if (next.page > 1) out.set('page', String(next.page))
      if (next.pageSize !== DEFAULT_QUERY.pageSize) out.set('size', String(next.pageSize))
      setParams(out, { replace: true })
    },
    [query, setParams],
  )

  const toggleSort = useCallback(
    (key: SortKey) => {
      const dir: SortDir = query.sortKey === key && query.sortDir === 'asc' ? 'desc' : 'asc'
      update({ sortKey: key, sortDir: dir })
    },
    [query.sortKey, query.sortDir, update],
  )

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  const isFiltered = Boolean(query.search || query.status !== 'all' || query.supplierId)

  return { query, update, toggleSort, reset, isFiltered, pageSizes: PAGE_SIZES }
}
