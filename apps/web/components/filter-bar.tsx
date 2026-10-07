'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import styles from './filter-bar.module.css'

export type FilterOption = { label: string; value: string }
export type FilterDefinition = { key: string; label: string; options: FilterOption[]; placeholder?: string }

export type FilterBarProps = {
  statusOptions: FilterOption[]
  severityOptions?: FilterOption[]
  customerOptions?: FilterOption[]
  filters?: FilterDefinition[]
  statusLabel?: string
  pageParam?: string
  onFiltersChange?: (filters: Record<string, string>) => void
}

export default function FilterBar({
  statusOptions,
  severityOptions,
  customerOptions,
  filters = [],
  statusLabel = 'Status',
  pageParam = 'page',
  onFiltersChange,
}: FilterBarProps) {
  const idPrefix = useId()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [values, setValues] = useState<Record<string, string>>({})
  const definitions: FilterDefinition[] = [
    { key: 'status', label: statusLabel, options: statusOptions, placeholder: 'All statuses' },
    ...(severityOptions ? [{ key: 'severity', label: 'Severity', options: severityOptions, placeholder: 'All severities' }] : []),
    ...(customerOptions ? [{ key: 'customerId', label: 'Customer', options: customerOptions, placeholder: 'All customers' }] : []),
    ...filters,
  ]

  useEffect(() => {
    const restored: Record<string, string> = {}
    definitions.forEach(({ key }) => { restored[key] = searchParams.get(key) ?? '' })
    setValues(restored)
    onFiltersChange?.(Object.fromEntries(Object.entries(restored).filter(([, value]) => value)))
  // Search params are the source of truth; this also restores on back/forward navigation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const changeFilter = useCallback((key: string, value: string) => {
    const next = { ...values, [key]: value }
    setValues(next)
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete(pageParam)
    onFiltersChange?.(Object.fromEntries(Object.entries(next).filter(([, current]) => current)))
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [values, searchParams, pageParam, onFiltersChange, pathname, router])

  function clearFilters() {
    const next: Record<string, string> = Object.fromEntries(definitions.map(({ key }) => [key, '']))
    setValues(next)
    const params = new URLSearchParams(searchParams.toString())
    definitions.forEach(({ key }) => params.delete(key))
    params.delete(pageParam)
    onFiltersChange?.({})
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const activeCount = definitions.filter(({ key }) => values[key]).length
  return (
    <form className={styles.bar} aria-label="Ticket filters" onSubmit={(event) => event.preventDefault()}>
      <div className={styles.filters}>
        {definitions.map((filter) => {
          const id = `${idPrefix}-filter-${filter.key}`
          return (
            <div className={styles.filter} key={filter.key}>
              <label htmlFor={id}>{filter.label}</label>
              <select id={id} value={values[filter.key] ?? ''} onChange={(event) => changeFilter(filter.key, event.target.value)}>
                <option value="">{filter.placeholder ?? `All ${filter.label.toLowerCase()}`}</option>
                {filter.options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
              </select>
            </div>
          )
        })}
      </div>
      {activeCount > 0 && <button className={styles.clear} type="button" onClick={clearFilters}>Clear filters <span className={styles.count}>({activeCount})</span></button>}
    </form>
  )
}
