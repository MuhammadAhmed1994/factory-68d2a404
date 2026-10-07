import type { ReactNode } from 'react'
import styles from './data-table.module.css'

export type DataTableColumn<Row> = {
  key: string
  header: string
  render?: (row: Row) => ReactNode
  /** A short label used to identify this cell when rows stack on small screens. */
  mobileLabel?: string
  className?: string
}

export type DataTableAction<Row> = {
  label: string | ((row: Row) => string)
  onClick: (row: Row) => void
  disabled?: (row: Row) => boolean
  variant?: 'default' | 'destructive'
}

export type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[]
  rows?: Row[]
  getRowKey: (row: Row) => string | number
  actions?: DataTableAction<Row>[] | ((row: Row) => ReactNode)
  /** Optional row context to make repeated action names distinguishable to assistive technology. */
  getRowLabel?: (row: Row) => string
  state?: 'loading' | 'empty' | 'error' | 'populated'
  loadingLabel?: string
  emptyMessage?: string
  errorMessage?: string
  caption?: string
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  pageLabel?: string
}

export default function DataTable<Row>({
  columns,
  rows = [],
  getRowKey,
  actions,
  getRowLabel,
  state,
  loadingLabel = 'Loading records…',
  emptyMessage = 'No records found.',
  errorMessage = 'Records could not be loaded. Please try again.',
  caption = 'Records',
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageLabel = 'records',
}: DataTableProps<Row>) {
  const tableState = state ?? (rows.length ? 'populated' : 'empty')
  const showActions = Boolean(actions)

  if (tableState === 'loading') {
    return <div className={styles.state} role="status" aria-live="polite"><span className={styles.spinner} aria-hidden="true" />{loadingLabel}</div>
  }
  if (tableState === 'error') return <div className={`${styles.state} ${styles.error}`} role="alert">{errorMessage}</div>
  if (tableState === 'empty' || (tableState === 'populated' && rows.length === 0)) {
    return <div className={styles.state} role="status">{emptyMessage}</div>
  }

  const safeTotalPages = Math.max(1, totalPages)
  const page = Math.min(Math.max(1, currentPage), safeTotalPages)
  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => <th scope="col" key={column.key} className={column.className}>{column.header}</th>)}
              {showActions && <th scope="col" className={styles.actionHeading}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} data-label={column.mobileLabel ?? column.header} className={column.className}>
                    {column.render ? column.render(row) : renderValue(row, column.key)}
                  </td>
                ))}
                {actions && <td data-label="Actions" className={styles.actionCell}>
                  {typeof actions === 'function' ? actions(row) : (
                    <div className={styles.actions}>
                      {actions.map((action, index) => {
                        const label = typeof action.label === 'function' ? action.label(row) : action.label
                        const accessibleLabel = getRowLabel ? `${label} ${getRowLabel(row)}` : label
                        return <button type="button" key={`${label}-${index}`} aria-label={accessibleLabel} className={action.variant === 'destructive' ? styles.destructiveAction : styles.action} disabled={action.disabled?.(row)} onClick={() => action.onClick(row)}>{label}</button>
                      })}
                    </div>
                  )}
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {safeTotalPages > 1 && (
        <nav className={styles.pagination} aria-label={`${pageLabel} pagination`}>
          <span className={styles.pageStatus} aria-live="polite">Page {page} of {safeTotalPages}</span>
          <div className={styles.pageActions}>
            <button type="button" onClick={() => onPageChange?.(page - 1)} disabled={!onPageChange || page <= 1} aria-label="Go to previous page">Previous</button>
            <button type="button" onClick={() => onPageChange?.(page + 1)} disabled={!onPageChange || page >= safeTotalPages} aria-label="Go to next page">Next</button>
          </div>
        </nav>
      )}
    </div>
  )
}

function renderValue<Row>(row: Row, key: string): ReactNode {
  const value = row && typeof row === 'object' ? (row as Record<string, unknown>)[key] : undefined
  if (value === null || value === undefined || typeof value === 'boolean') return value === false ? 'No' : value === true ? 'Yes' : '—'
  if (typeof value === 'string' || typeof value === 'number') return value
  return String(value)
}
