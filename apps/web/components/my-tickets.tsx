'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import DataTable, { type DataTableColumn } from './data-table'
import FilterBar from './filter-bar'
import StatusBadge from './status-badge'
import { apiRequest } from '../lib/api-client'

type Ticket = {
  id: string
  reference: string
  title: string
  status: 'New' | 'In Progress' | 'Resolved' | 'Closed'
  severity: 'Low' | 'Medium' | 'High'
  updatedAt: string
}

const statusOptions = [
  { label: 'New', value: 'New' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
]

function localDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function MyTickets() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    apiRequest<Ticket[]>(`/tickets${query}`)
      .then((result) => { if (active) setTickets(result) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [status, retry])

  const columns = useMemo<DataTableColumn<Ticket>[]>(() => [
    { key: 'reference', header: 'Reference', render: (ticket) => <span style={{ fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}>{ticket.reference}</span> },
    { key: 'title', header: 'Ticket', render: (ticket) => <Link href={`/tickets/${encodeURIComponent(ticket.id)}`} aria-label={`View ticket ${ticket.reference}: ${ticket.title}`}>{ticket.title}</Link> },
    { key: 'status', header: 'Status', render: (ticket) => <StatusBadge status={ticket.status} /> },
    { key: 'severity', header: 'Severity', render: (ticket) => <StatusBadge status={ticket.severity} /> },
    { key: 'updatedAt', header: 'Updated', render: (ticket) => <time dateTime={ticket.updatedAt}>{localDateTime(ticket.updatedAt)}</time> },
  ], [])

  const handleFiltersChange = useCallback(() => {
    // The URL is the source of truth; its searchParams change triggers the request above.
  }, [])

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
        <div>
          <p style={{ margin: '0 0 6px', color: 'var(--sd-muted-foreground)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em' }}>Support requests</p>
          <h1 style={{ margin: 0, fontSize: 24, lineHeight: '32px' }}>My tickets</h1>
          <p style={{ margin: '5px 0 0', color: 'var(--sd-muted-foreground)' }}>Track and manage your support requests.</p>
        </div>
        <Link href="/tickets/new" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '0 16px', borderRadius: 6, background: 'var(--sd-primary)', color: 'white', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>Create ticket</Link>
      </header>
      <p style={{ margin: '20px 0', color: 'var(--sd-muted-foreground)', fontSize: 13 }}>Only tickets for your account are shown. &nbsp;·&nbsp; Times are shown in your local time zone.</p>
      <section aria-label="Your support tickets" style={{ overflow: 'hidden', border: '1px solid var(--sd-border)', borderRadius: 8, background: 'var(--sd-card)', boxShadow: 'var(--sd-shadow-panel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: 16, borderBottom: '1px solid var(--sd-border)' }}>
          <div><strong>Your requests</strong><div style={{ color: 'var(--sd-muted-foreground)', fontSize: 12 }}>Review the latest updates from our team.</div></div>
          <FilterBar statusOptions={statusOptions} statusLabel="Filter by status" onFiltersChange={handleFiltersChange} />
        </div>
        {error ? (
          <div role="alert" style={{ padding: 24, color: 'var(--sd-destructive)' }}>Your tickets couldn&apos;t be loaded. Try again. <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>
        ) : loading ? (
          <div role="status" aria-live="polite" style={{ padding: 24 }}>Loading your tickets…</div>
        ) : tickets.length === 0 ? (
          <div role="status" style={{ padding: 24 }}>You don&apos;t have any tickets yet. <Link href="/tickets/new">Create ticket</Link></div>
        ) : (
          <DataTable
            columns={columns}
            rows={tickets}
            getRowKey={(ticket) => ticket.id}
            state="populated"
            caption="My support tickets"
          />
        )}
      </section>
      <p style={{ marginTop: 14, color: 'var(--sd-muted-foreground)', fontSize: 12 }}>Updates are shown in your local time zone.</p>
    </main>
  )
}
