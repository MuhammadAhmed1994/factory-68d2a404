'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { apiRequest } from '../lib/api-client'
import DataTable, { type DataTableColumn } from './data-table'
import FilterBar, { type FilterOption } from './filter-bar'
import StatusBadge from './status-badge'

type Ticket = {
  id: string
  reference: number | string
  customerId: string
  title: string
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  updatedAt: string
  customer: { id: string; name: string }
}

type Customer = { id: string; name: string }
type CustomerList = { customers: Customer[] }

const statusOptions: FilterOption[] = [
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]
const severityOptions: FilterOption[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
]
const statusLabels: Record<Ticket['status'], 'New' | 'In Progress' | 'Resolved' | 'Closed'> = {
  NEW: 'New', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed',
}
const severityLabels: Record<Ticket['severity'], 'Low' | 'Medium' | 'High'> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High',
}

function localDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function ticketFilterQuery(search: URLSearchParams): string {
  const filters = new URLSearchParams()
  for (const key of ['status', 'severity', 'customerId']) {
    const value = search.get(key)
    if (value) filters.set(key, value)
  }
  return filters.toString()
}

export default function AdminTicketList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.toString()
  const filterQuery = ticketFilterQuery(new URLSearchParams(urlQuery))
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    const ticketPath = filterQuery ? `/tickets?${filterQuery}` : '/tickets'
    Promise.all([
      apiRequest<Ticket[]>(ticketPath),
      apiRequest<CustomerList>('/customers'),
    ]).then(([ticketRows, customerResult]) => {
      if (!current) return
      setTickets(ticketRows)
      setCustomers(customerResult.customers)
      setLoading(false)
    }).catch(() => {
      if (!current) return
      setError("Tickets couldn't be loaded. Try again.")
      setLoading(false)
    })
    return () => { current = false }
  }, [filterQuery, reload])

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  const columns: DataTableColumn<Ticket>[] = [
    { key: 'reference', header: 'Reference', mobileLabel: 'Reference', render: (ticket) => `SD-${ticket.reference}` },
    { key: 'title', header: 'Ticket', mobileLabel: 'Title', render: (ticket) => <Link href={`/admin/tickets/${ticket.id}`} aria-label={`Open ticket SD-${ticket.reference}: ${ticket.title}`}>{ticket.title}</Link> },
    { key: 'customer', header: 'Customer', mobileLabel: 'Customer', render: (ticket) => ticket.customer.name },
    { key: 'status', header: 'Status', mobileLabel: 'Status', render: (ticket) => <StatusBadge status={statusLabels[ticket.status]} /> },
    { key: 'severity', header: 'Severity', mobileLabel: 'Severity', render: (ticket) => <StatusBadge status={severityLabels[ticket.severity]} /> },
    { key: 'updatedAt', header: 'Updated', mobileLabel: 'Updated', render: (ticket) => <time dateTime={ticket.updatedAt}>{localDateTime(ticket.updatedAt)}</time> },
  ]

  const customerOptions = customers.map((customer) => ({ value: customer.id, label: customer.name }))
  return (
    <section aria-labelledby="admin-tickets-title">
      <header>
        <div>
          <p>Ticket management</p>
          <h1 id="admin-tickets-title">All tickets</h1>
          <p>Review and manage support requests across your workspace.</p>
        </div>
        <Link href="/admin/tickets/new">Create ticket</Link>
      </header>

      <FilterBar statusOptions={statusOptions} severityOptions={severityOptions} customerOptions={customerOptions} />
      <p>Filters are saved in this page’s URL. Times are shown in your local time zone.</p>
      <section aria-labelledby="ticket-list-heading">
        <h2 id="ticket-list-heading">Tickets</h2>
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setReload((value) => value + 1)}>Try again</button>
          </div>
        ) : (
          <>
            <DataTable<Ticket>
              columns={columns}
              rows={tickets}
              getRowKey={(ticket) => ticket.id}
              state={loading ? 'loading' : tickets.length ? 'populated' : 'empty'}
              loadingLabel="Loading tickets…"
              emptyMessage="No tickets match these filters."
              caption="All support tickets"
            />
            {!loading && tickets.length === 0 && <button type="button" onClick={clearFilters}>Clear filters</button>}
          </>
        )}
      </section>
    </section>
  )
}
