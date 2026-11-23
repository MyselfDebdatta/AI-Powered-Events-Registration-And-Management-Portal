import { Inbox } from 'lucide-react'
import { cn } from '../../lib/cn'
import Button from './Button'
import EmptyState from './EmptyState'
import Skeleton from './Skeleton'

/**
 * Table — one data source, two presentations: a semantic table at ≥768px and
 * definition-list cards below, both from the same column config (§8.4).
 * Columns accept: key, label, render(value,row), align, primary, status,
 * actions, hideOnMobile.
 */

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

function isActionsColumn(col) {
  return col.actions === true || col.key === 'actions'
}

function cellContent(column, row) {
  const value = row[column.key]
  if (column.render) return column.render(value, row)
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value
}

export function Table({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data found',
  emptyBody,
  loading = false,
  caption,
  showCount = false,
  rowActionLabel = 'View details',
  rowKey = (row, index) => row.id ?? index,
  className,
}) {
  const rows = data ?? []

  const primaryColumn =
    columns.find((col) => col.primary) ??
    columns.find((col) => !isActionsColumn(col)) ??
    columns[0]
  const statusColumn = columns.find((col) => col.status && col !== primaryColumn)
  const actionColumns = columns.filter(isActionsColumn)
  const detailColumns = columns.filter(
    (col) => col !== primaryColumn && col !== statusColumn && !isActionsColumn(col) && !col.hideOnMobile
  )

  if (loading) {
    return (
      <div aria-busy="true" className={cn('w-full', className)}>
        <span className="sr-only">Loading results…</span>
        <Skeleton variant="table" className="hidden md:block" rows={4} cols={Math.min(columns.length, 5)} />
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="card" className="h-28" />
          ))}
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyMessage}
        body={emptyBody}
        className={className}
      />
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {showCount && (
        <p className="mb-2 text-xs text-text-muted">
          {caption ?? `${rows.length} result${rows.length === 1 ? '' : 's'}`}
        </p>
      )}

      {/* ≥768px: semantic table */}
      <div className="hidden overflow-x-auto rounded-md border border-border bg-paper md:block">
        <table className="min-w-full">
          <caption className="sr-only">
            {caption ?? `${rows.length} result${rows.length === 1 ? '' : 's'}`}
          </caption>
          <thead className="bg-sand-100">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted',
                    alignClass[col.align ?? 'left']
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'transition-colors duration-fast',
                  onRowClick &&
                    'cursor-pointer hover:bg-ivory-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-900'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 align-middle text-sm text-slate-700',
                      alignClass[col.align ?? 'left']
                    )}
                  >
                    {cellContent(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* <768px: card list from the same column config */}
      <ul className="space-y-3 md:hidden" aria-label={caption ?? 'Results'}>
        {rows.map((row, index) => (
          <li key={rowKey(row, index)}>
            <article className="rounded-md border border-border bg-paper p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-semibold text-text">
                  {cellContent(primaryColumn, row)}
                </p>
                {statusColumn && (
                  <div className="shrink-0">{cellContent(statusColumn, row)}</div>
                )}
              </div>
              {detailColumns.length > 0 && (
                <dl className="mt-3 space-y-2">
                  {detailColumns.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-start justify-between gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0"
                    >
                      <dt className="shrink-0 text-xs text-text-muted">{col.label}</dt>
                      <dd className="min-w-0 break-words text-right text-sm text-slate-700">
                        {cellContent(col, row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {(actionColumns.length > 0 || onRowClick) && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {actionColumns.map((col) => (
                    <div key={col.key} className="text-sm">
                      {cellContent(col, row)}
                    </div>
                  ))}
                  {onRowClick && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRowClick(row)}
                      className="ml-auto"
                    >
                      {rowActionLabel}
                    </Button>
                  )}
                </div>
              )}
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Table
