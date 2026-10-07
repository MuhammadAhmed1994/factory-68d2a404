'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { apiRequest } from '../lib/api-client'
import StatusBadge from './status-badge'
import styles from './customer-list.module.css'

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

function formatLocalDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date)
}

export default function CustomerList() {
  const searchId = useId()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page')) || 1))
  const [result, setResult] = useState<CustomerPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => setHasMounted(true), [])

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '')
    setPage(Math.max(1, Number(searchParams.get('page')) || 1))
  }, [searchParams])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    const query = new URLSearchParams({ page: String(page) })
    if (search.trim()) query.set('search', search.trim())

    apiRequest<CustomerPage>(`/customers?${query.toString()}`, { signal: controller.signal })
      .then((data) => {
        setResult(data)
        setError(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [page, search, retryCount])

  function updateUrl(nextSearch: string, nextPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextSearch.trim()) params.set('search', nextSearch.trim())
    else params.delete('search')
    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
    updateUrl(value, 1)
  }

  function changePage(nextPage: number) {
    if (nextPage < 1) return
    setPage(nextPage)
    updateUrl(search, nextPage)
  }

  const customers = result?.customers ?? []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const firstRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastRecord = Math.min(page * PAGE_SIZE, total)

  return (
    <section className={styles.page} aria-labelledby="customers-title">
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <span>Admin</span><span aria-hidden="true">/</span><span aria-current="page">Customers</span>
      </nav>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Customer management</p>
          <h1 id="customers-title">Customers</h1>
          <p className={styles.description}>Manage the people who contact your support team.</p>
        </div>
        <Link className={styles.addButton} href="/admin/customers/new">＋ <span>Add customer</span></Link>
      </header>

      <div className={styles.panel}>
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <label htmlFor={searchId}>Search customers</label>
            <input
              id={searchId}
              type="search"
              placeholder="Search customers"
              autoComplete="off"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
            />
          </div>
          <span className={styles.count}>{loading ? 'Loading customers…' : `${total} ${total === 1 ? 'customer' : 'customers'}`}</span>
        </div>

        {loading ? (
          <div className={styles.state} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />Loading customers…
            <div className={styles.skeletonRows} aria-hidden="true"><span /><span /><span /></div>
          </div>
        ) : error ? (
          <div className={`${styles.state} ${styles.error}`} role="alert">
            <p>Customers couldn&apos;t be loaded. Try again.</p>
            <button className={styles.secondaryButton} type="button" onClick={() => setRetryCount((count) => count + 1)}>Retry</button>
          </div>
        ) : customers.length === 0 ? (
          <div className={styles.state} role="status">
            <p>No customers found.</p>
            {search.trim() ? <button className={styles.textButton} type="button" onClick={() => changeSearch('')}>Clear search</button> : <Link className={styles.textButton} href="/admin/customers/new">Add customer</Link>}
          </div>
        ) : (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <caption>Customer records, newest first</caption>
                <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Account state</th><th scope="col">Created</th></tr></thead>
                <tbody>
                  {customers.slice(0, PAGE_SIZE).map((customer) => (
                    <tr key={customer.id}>
                      <td data-label="Name"><span className={styles.customerName}>{customer.name}</span></td>
                      <td data-label="Email" className={styles.email}>{customer.email}</td>
                      <td data-label="Account state"><StatusBadge status={customer.isActive ? 'Active' : 'Inactive'} /></td>
                      <td data-label="Created"><time className={styles.date} dateTime={customer.createdAt}>{hasMounted ? formatLocalDate(customer.createdAt) : '—'}</time></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className={styles.pagination} aria-label="Customer pagination">
              <p className={styles.paginationSummary} aria-live="polite">Showing <strong>{firstRecord}–{lastRecord}</strong> of <strong>{total}</strong> customers</p>
              <div className={styles.controls}>
                <button type="button" onClick={() => changePage(page - 1)} disabled={page <= 1} aria-label="Previous page">Previous</button>
                <span aria-current="page" aria-label={`Page ${page}`}>Page {page} of {totalPages}</span>
                <button type="button" onClick={() => changePage(page + 1)} disabled={page >= totalPages} aria-label="Next page">Next</button>
              </div>
            </nav>
          </>
        )}
      </div>

      <p className={styles.helper}><strong>Up to 20 customers per page, newest first.</strong> Dates are shown in your local time zone. Customer accounts are deactivated or reactivated, not deleted.</p>
    </section>
  )
}
