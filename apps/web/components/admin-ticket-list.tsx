'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { apiRequest } from '../lib/api-client'
import DataTable, { type DataTableColumn } from './data-table'
import FilterBar, { type FilterOption } from './filter-bar'
import StatusBadge, { type TicketSeverity, type TicketStatus } from './status-badge'

const statuses: FilterOption[] = [
  { label: 'New', value: 'NEW' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
]
const severities: FilterOption[] = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
]
const statusLabel: Record<string, TicketStatus> = {
  NEW: 'New', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed',
}
const severityLabel: Record<string, TicketSeverity> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }

type Ticket = {
  id: string
  reference: number | string
  title: string
  status: keyof typeof statusLabel
  severity: keyof typeof severityLabel
  updatedAt: string
  customer: { id: string; name: string }
}
type Customer = { id: string; name: string }
type CustomerResponse = { customers: Customer[] }
type TicketFilters = { status?: string; severity?: string; customerId?: string }

function localTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function ticketReference(value: number | string): string {
  const digits = String(value).replace(/^SD-/, '')
  return `SD-${digits.padStart(4, '0')}`
}

export default function AdminTicketList() {
  const pathname = usePathname()
  const router = useRouter()
  const [filters, setFilters] = useState<TicketFilters>({})
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [customerError, setCustomerError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const onFiltersChange = useCallback((next: Record<string, string>) => {
    setFilters({ status: next.status, severity: next.severity, customerId: next.customerId })
    setPage(1)
  }, [])

  useEffect(() => {
    let active = true
    apiRequest<CustomerResponse | Customer[]>('/customers')
      .then((response) => {
        if (!active) return
        const items = Array.isArray(response) ? response : response.customers
        setCustomers(items.map(({ id, name }) => ({ id, name })))
        setCustomerError(false)
      })
      .catch(() => { if (active) setCustomerError(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const query = new URLSearchParams()
    if (filters.status) query.set('status', filters.status)
    if (filters.severity) query.set('severity', filters.severity)
    if (filters.customerId) query.set('customerId', filters.customerId)
    const queryString = query.toString()
    setLoading(true)
    setError(false)
    apiRequest<Ticket[]>(`/tickets${queryString ? `?${queryString}` : ''}`)
      .then((result) => {
        if (!active) return
        setTickets(result)
        setPage(1)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError(true)
        setLoading(false)
      })
    return () => { active = false }
  }, [filters, retry])

  const customerOptions = useMemo(() => customers.map(({ id, name }) => ({ label: name, value: id })), [customers])
  const columns: DataTableColumn<Ticket>[] = [
    { key: 'reference', header: 'Reference', mobileLabel: 'Reference', render: (ticket) => ticketReference(ticket.reference) },
    {
      key: 'title', header: 'Title', mobileLabel: 'Ticket', render: (ticket) => (
        <Link href={`/admin/tickets/${ticket.id}`} aria-label={`Open ticket ${ticketReference(ticket.reference)}: ${ticket.title}`}>
          {ticket.title}
        </Link>
      ),
    },
    { key: 'customer', header: 'Customer', mobileLabel: 'Customer', render: (ticket) => ticket.customer.name },
    { key: 'status', header: 'Status', mobileLabel: 'Status', render: (ticket) => <StatusBadge status={statusLabel[ticket.status]} /> },
    { key: 'severity', header: 'Severity', mobileLabel: 'Severity', render: (ticket) => <StatusBadge status={severityLabel[ticket.severity]} /> },
    { key: 'updatedAt', header: 'Updated', mobileLabel: 'Updated', render: (ticket) => <time dateTime={ticket.updatedAt}>{localTime(ticket.updatedAt)}</time> },
  ]
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize))
  const visibleTickets = tickets.slice((page - 1) * pageSize, page * pageSize)

  function clearFilters() {
    router.replace(pathname, { scroll: false })
    setFilters({})
    setPage(1)
  }

  return (
    <section aria-labelledby="admin-tickets-title">
      <header>
        <p>Ticket management</p>
        <h1 id="admin-tickets-title">All tickets</h1>
        <p>Review and manage support requests across your workspace.</p>
        <Link href="/admin/tickets/new">Create ticket</Link>
      </header>

      <section aria-label="Filter tickets">
        <FilterBar
          statusOptions={statuses}
          severityOptions={severities}
          customerOptions={customerOptions}
          onFiltersChange={onFiltersChange}
        />
        {customerError && <p role="alert">Customer filter options couldn’t be loaded.</p>}
        <p>Filters are saved in this page’s URL. Times are shown in your local time zone.</p>
      </section>

      <section aria-labelledby="ticket-list-heading">
        <h2 id="ticket-list-heading">Tickets</h2>
        {loading ? (
          <div role="status" aria-live="polite">Loading tickets…</div>
        ) : error ? (
          <div role="alert">
            <p>Tickets couldn’t be loaded. Try again.</p>
            <button type="button" onClick={() => setRetry((count) => count + 1)}>Retry</button>
          </div>
        ) : tickets.length === 0 ? (
          <div role="status">
            <p>No tickets match these filters.</p>
            <button type="button" onClick={clearFilters}>Clear filters</button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={visibleTickets}
            getRowKey={(ticket) => ticket.id}
            caption="All support tickets"
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageLabel="ticket"
          />
        )}
      </section>
    </section>
  )
}
