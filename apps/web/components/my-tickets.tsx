'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../lib/api-client'
import StatusBadge, { type TicketSeverity, type TicketStatus } from './status-badge'

export interface CustomerTicketRow {
  id: string
  reference: number | string
  title: string
  status: TicketStatus | string
  severity: TicketSeverity | string
  updatedAt: string
}

const statuses = [
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]
const statusLabels: Record<string, TicketStatus> = { NEW: 'New', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', 'New': 'New', 'In Progress': 'In Progress', Resolved: 'Resolved', Closed: 'Closed' }
const severityLabels: Record<string, TicketSeverity> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', Low: 'Low', Medium: 'Medium', High: 'High' }
const styles = {
  page: { width: 'min(100%, 1260px)', margin: '0 auto', padding: '40px clamp(18px, 4vw, 40px)' },
  heading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' as const, marginBottom: 24 },
  eyebrow: { margin: '0 0 6px', color: 'var(--sd-muted-foreground)', fontSize: 12, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase' as const },
  title: { margin: 0, fontSize: 24, lineHeight: '32px', fontWeight: 600 },
  subtitle: { margin: '5px 0 0', color: 'var(--sd-muted-foreground)' },
  create: { display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '0 16px', borderRadius: 6, background: 'var(--sd-primary)', color: 'white', fontWeight: 600, textDecoration: 'none' },
  note: { margin: '0 0 20px', color: 'var(--sd-muted-foreground)', fontSize: 13 },
  panel: { overflow: 'hidden', border: '1px solid var(--sd-border)', borderRadius: 10, background: 'var(--sd-card)', boxShadow: 'var(--sd-shadow-panel)' },
  filter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--sd-border)', flexWrap: 'wrap' as const },
  select: { display: 'block', minWidth: 190, height: 38, padding: '0 10px', border: '1px solid var(--sd-border)', borderRadius: 5, background: 'white', color: 'var(--sd-foreground)', font: 'inherit' },
  state: { padding: '36px 20px', textAlign: 'center' as const, color: 'var(--sd-muted-foreground)' },
  tableWrap: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, textAlign: 'left' as const },
  cell: { padding: '15px 18px', borderBottom: '1px solid #edf1f3', verticalAlign: 'middle' as const },
  th: { padding: '12px 18px', background: '#f8fafb', color: 'var(--sd-muted-foreground)', fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' as const, borderBottom: '1px solid var(--sd-border)' },
  reference: { fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' as const },
  link: { fontWeight: 600, textDecoration: 'none' },
} as const

function displayReference(reference: number | string): string {
  return typeof reference === 'number' ? `SD-${String(reference).padStart(4, '0')}` : reference
}

function localDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function MyTickets() {
  const [status, setStatus] = useState('')
  const [tickets, setTickets] = useState<CustomerTicketRow[]>([])
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')

  const loadTickets = useCallback(async (filter: string) => {
    setState('loading')
    try {
      const query = filter ? `?status=${encodeURIComponent(filter)}` : ''
      const result = await apiRequest<CustomerTicketRow[]>(`/tickets${query}`)
      setTickets(Array.isArray(result) ? result : [])
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => {
    const queryStatus = new URLSearchParams(window.location.search).get('status') ?? ''
    setStatus(queryStatus)
    void loadTickets(queryStatus)
    const restore = () => {
      const restored = new URLSearchParams(window.location.search).get('status') ?? ''
      setStatus(restored)
      void loadTickets(restored)
    }
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [loadTickets])

  function changeStatus(value: string) {
    setStatus(value)
    const params = new URLSearchParams(window.location.search)
    if (value) params.set('status', value)
    else params.delete('status')
    const query = params.toString()
    window.history.replaceState(null, '', query ? `/tickets?${query}` : '/tickets')
    void loadTickets(value)
  }

  return (
    <main style={styles.page}>
      <div style={styles.heading}>
        <div>
          <p style={styles.eyebrow}>Support requests</p>
          <h1 style={styles.title}>My tickets</h1>
          <p style={styles.subtitle}>Track and manage your support requests.</p>
        </div>
        <Link href="/tickets/new" style={styles.create}>＋ <span>Create ticket</span></Link>
      </div>
      <p style={styles.note}>Only tickets for your account are shown. · Times are shown in your local time zone.</p>
      <section style={styles.panel} aria-label="Your support tickets">
        <div style={styles.filter}>
          <div>
            <strong>Your requests</strong>
            <div style={{ color: 'var(--sd-muted-foreground)', fontSize: 12 }}>Review the latest updates from our team.</div>
          </div>
          <label>
            <span style={{ marginRight: 10 }}>Filter by status</span>
            <select aria-label="Filter by status" value={status} style={styles.select} onChange={(event) => changeStatus(event.target.value)}>
              <option value="">All statuses</option>
              {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
        {state === 'loading' ? <p style={styles.state} role="status">Loading your tickets…</p> : null}
        {state === 'error' ? (
          <div style={styles.state} role="alert">
            <p>Your tickets couldn&apos;t be loaded. Try again.</p>
            <button type="button" onClick={() => void loadTickets(status)}>Retry</button>
          </div>
        ) : null}
        {state === 'ready' && tickets.length === 0 ? (
          <div style={styles.state} role="status">
            <p>You don&apos;t have any tickets yet.</p>
            <Link href="/tickets/new" style={styles.link}>Create ticket</Link>
          </div>
        ) : null}
        {state === 'ready' && tickets.length > 0 ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Your support tickets</caption>
              <thead><tr>{['Reference', 'Ticket', 'Status', 'Severity', 'Updated'].map((label) => <th key={label} scope="col" style={styles.th}>{label}</th>)}</tr></thead>
              <tbody>{tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td style={{ ...styles.cell, ...styles.reference }}>{displayReference(ticket.reference)}</td>
                  <td style={styles.cell}><Link href={`/tickets/${encodeURIComponent(ticket.id)}`} style={styles.link} aria-label={`View ticket ${displayReference(ticket.reference)}: ${ticket.title}`}>{ticket.title}</Link></td>
                  <td style={styles.cell}><StatusBadge status={statusLabels[ticket.status] ?? 'New'} /></td>
                  <td style={styles.cell}><StatusBadge status={severityLabels[ticket.severity] ?? 'Low'} /></td>
                  <td style={styles.cell}><time dateTime={ticket.updatedAt}>{localDate(ticket.updatedAt)}</time></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  )
}
