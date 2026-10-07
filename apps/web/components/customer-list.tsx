'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import DataTable, { type DataTableColumn } from './data-table'
import StatusBadge from './status-badge'
import { apiRequest } from '../lib/api-client'

type Customer = {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
}

type CustomerPage = {
  customers: Customer[]
  page: number
  limit: number
  total: number
}

const PAGE_SIZE = 20
const ERROR_COPY = "Customers couldn't be loaded. Try again."

function safeDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getPageUrl(pathname: string, search: string, page: number): string {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export default function CustomerList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [page, setPage] = useState(() => {
    const requestedPage = Number(searchParams.get('page') ?? '1')
    return Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  })
  const [result, setResult] = useState<CustomerPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)

  const loadCustomers = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError(false)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    if (search.trim()) params.set('search', search.trim())
    try {
      const response = await apiRequest<CustomerPage>(`/customers?${params.toString()}`, { signal })
      if (signal.aborted) return
      setResult({
        ...response,
        customers: Array.isArray(response.customers) ? response.customers.slice(0, PAGE_SIZE) : [],
        page: response.page ?? page,
        limit: PAGE_SIZE,
        total: Number.isFinite(response.total) ? response.total : 0,
      })
    } catch {
      if (!signal.aborted) setError(true)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    const controller = new AbortController()
    void loadCustomers(controller.signal)
    return () => controller.abort()
  }, [loadCustomers, retry])

  // Keep search and pagination reloadable and compatible with browser back/forward navigation.
  useEffect(() => {
    const restoredSearch = searchParams.get('search') ?? ''
    const requestedPage = Number(searchParams.get('page') ?? '1')
    setSearch((current) => current === restoredSearch ? current : restoredSearch)
    setPage(Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1)
  }, [searchParams])

  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
    router.replace(getPageUrl(pathname, value, 1), { scroll: false })
  }

  function changePage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return
    setPage(nextPage)
    router.push(getPageUrl(pathname, search, nextPage), { scroll: false })
  }

  const columns = useMemo<DataTableColumn<Customer>[]>(() => [
    { key: 'name', header: 'Name', mobileLabel: 'Name' },
    { key: 'email', header: 'Email', mobileLabel: 'Email' },
    {
      key: 'isActive',
      header: 'Account state',
      mobileLabel: 'Account state',
      render: (customer) => <StatusBadge status={customer.isActive ? 'Active' : 'Inactive'} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      mobileLabel: 'Created',
      render: (customer) => <time dateTime={customer.createdAt}>{safeDate(customer.createdAt)}</time>,
    },
  ], [])

  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const firstRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastRecord = Math.min(page * PAGE_SIZE, total)
  const isEmpty = !loading && !error && (result?.customers.length ?? 0) === 0

  return (
    <section aria-labelledby="customers-title">
      <nav aria-label="Breadcrumb" style={{ marginBottom: 24, color: 'var(--sd-muted-foreground)', fontSize: 13 }}>
        <span>Admin</span><span aria-hidden="true"> / </span><span aria-current="page">Customers</span>
      </nav>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <p style={{ margin: '0 0 4px', color: 'var(--sd-primary)', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>Customer management</p>
          <h1 id="customers-title" style={{ margin: 0, fontSize: 24, lineHeight: '32px', fontWeight: 600 }}>Customers</h1>
          <p style={{ margin: '5px 0 0', color: 'var(--sd-muted-foreground)' }}>Manage the people who contact your support team.</p>
        </div>
        <Link href="/admin/customers/new" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '0 14px', borderRadius: 6, background: 'var(--sd-primary)', color: 'white', fontWeight: 600, textDecoration: 'none' }}>
          Add customer
        </Link>
      </header>

      <section aria-label="Customer records" style={{ overflow: 'hidden', border: '1px solid var(--sd-border)', borderRadius: 8, background: 'var(--sd-card)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 16, borderBottom: '1px solid var(--sd-border)' }}>
          <label htmlFor="customer-search" style={{ display: 'grid', gap: 4, width: 'min(100%, 350px)', color: 'var(--sd-muted-foreground)', fontSize: 12, fontWeight: 600 }}>
            Search customers
            <input
              id="customer-search"
              type="search"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Search by name or email"
              autoComplete="off"
              style={{ width: '100%', minHeight: 40, padding: '8px 12px', border: '1px solid var(--sd-border)', borderRadius: 5, color: 'var(--sd-foreground)', font: 'inherit', fontWeight: 400 }}
            />
          </label>
          <span style={{ color: 'var(--sd-muted-foreground)', fontSize: 12 }}>
            <strong style={{ color: 'var(--sd-foreground)' }}>{loading ? '—' : total}</strong> customers
          </span>
        </div>

        {loading ? (
          <div role="status" aria-live="polite" style={{ padding: '28px 20px', color: 'var(--sd-muted-foreground)' }}>
            <span style={{ display: 'block', marginBottom: 12 }}>Loading customers…</span>
            <span aria-hidden="true" style={{ display: 'block', height: 12, margin: '10px 0', borderRadius: 4, background: 'var(--sd-muted)' }} />
            <span aria-hidden="true" style={{ display: 'block', height: 12, width: '78%', margin: '10px 0', borderRadius: 4, background: 'var(--sd-muted)' }} />
            <span aria-hidden="true" style={{ display: 'block', height: 12, width: '88%', margin: '10px 0', borderRadius: 4, background: 'var(--sd-muted)' }} />
          </div>
        ) : error ? (
          <div role="alert" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28, color: 'var(--sd-destructive)' }}>
            <span>{ERROR_COPY}</span>
            <button type="button" onClick={() => setRetry((current) => current + 1)} style={{ minHeight: 36, padding: '0 12px', border: '1px solid var(--sd-border)', borderRadius: 5, background: 'white', color: 'var(--sd-primary)', fontWeight: 600, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : isEmpty ? (
          <div role="status" style={{ display: 'grid', justifyItems: 'center', gap: 10, padding: 32, color: 'var(--sd-muted-foreground)', textAlign: 'center' }}>
            <p style={{ margin: 0 }}>No customers found.</p>
            {search.trim() ? (
              <button type="button" onClick={() => changeSearch('')} style={{ border: 0, background: 'transparent', color: 'var(--sd-primary)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Clear search</button>
            ) : <Link href="/admin/customers/new">Add customer</Link>}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={result?.customers ?? []}
            getRowKey={(customer) => customer.id}
            caption="Customer records, newest first"
            state="populated"
          />
        )}

        {!loading && !error && !isEmpty && (
          <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--sd-border)' }}>
            <span aria-live="polite" style={{ color: 'var(--sd-muted-foreground)', fontSize: 12 }}>
              Showing <strong>{firstRecord}–{lastRecord}</strong> of <strong>{total}</strong> customers
            </span>
            <nav aria-label="Customer pagination" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => changePage(page - 1)} disabled={page <= 1} aria-label="Previous page">Previous</button>
              <span aria-current="page" aria-label={`Page ${page}`}>{page}</span>
              <button type="button" onClick={() => changePage(page + 1)} disabled={page >= totalPages} aria-label="Next page">Next</button>
            </nav>
          </footer>
        )}
      </section>
      <p style={{ display: 'flex', gap: 8, margin: '16px 0 0', color: 'var(--sd-muted-foreground)', fontSize: 12 }}>
        <span aria-hidden="true">ⓘ</span><span><strong>Up to 20 customers per page, newest first.</strong> Dates are shown in your local time zone. Customer accounts are deactivated or reactivated, not deleted.</span>
      </p>
    </section>
  )
}
