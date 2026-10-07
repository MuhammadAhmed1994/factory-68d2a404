'use client'

import Link from 'next/link'
import { useState } from 'react'
import StatusBadge, { type TicketSeverity, type TicketStatus } from './status-badge'

export interface CustomerTicketAttachment {
  id: string
  fileName: string
  sizeBytes: number
  mimeType?: string
  uploadedById?: string
  uploader?: string
  createdAt?: string
}

export interface CustomerTicket {
  id: string
  reference: number | string
  title: string
  description: string
  status: TicketStatus | string
  severity: TicketSeverity | string
  createdAt: string
  updatedAt: string
  attachments: CustomerTicketAttachment[]
}

const statusLabels: Record<string, TicketStatus> = { NEW: 'New', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', New: 'New', 'In Progress': 'In Progress', Resolved: 'Resolved', Closed: 'Closed' }
const severityLabels: Record<string, TicketSeverity> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', Low: 'Low', Medium: 'Medium', High: 'High' }
const styles = {
  page: { width: 'min(100%, 1100px)', margin: '0 auto', padding: '40px clamp(18px, 4vw, 40px)' },
  back: { display: 'inline-block', marginBottom: 20, fontWeight: 600, textDecoration: 'none' },
  card: { padding: 'clamp(20px, 4vw, 32px)', border: '1px solid var(--sd-border)', borderRadius: 10, background: 'var(--sd-card)', boxShadow: 'var(--sd-shadow-panel)' },
  ref: { margin: 0, color: 'var(--sd-muted-foreground)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 },
  title: { margin: '8px 0 20px', fontSize: 26, lineHeight: 1.3, fontWeight: 600, overflowWrap: 'anywhere' as const },
  summary: { display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 26 },
  divider: { border: 0, borderTop: '1px solid var(--sd-border)', margin: '24px 0' },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, lineHeight: '26px' },
  description: { margin: 0, whiteSpace: 'pre-wrap' as const, overflowWrap: 'anywhere' as const, lineHeight: 1.7 },
  metadata: { display: 'flex', flexWrap: 'wrap' as const, gap: '12px 28px', color: 'var(--sd-muted-foreground)', fontSize: 13 },
  attachment: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' as const, padding: '14px 0', borderBottom: '1px solid #edf1f3' },
  download: { display: 'inline-flex', padding: '8px 12px', border: '1px solid var(--sd-border)', borderRadius: 5, textDecoration: 'none', fontWeight: 600, background: 'white', cursor: 'pointer', color: 'var(--sd-primary)' },
  muted: { color: 'var(--sd-muted-foreground)', fontSize: 13 },
  notFound: { maxWidth: 620, margin: '9vh auto', padding: 30, textAlign: 'center' as const, border: '1px solid var(--sd-border)', borderRadius: 10, background: 'var(--sd-card)' },
} as const

function displayReference(reference: number | string): string {
  return typeof reference === 'number' ? `SD-${String(reference).padStart(4, '0')}` : reference
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1 }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

function LocalTime({ value }: { value: string }) {
  const date = new Date(value)
  return <time dateTime={value}>{Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
}

export default function CustomerTicketDetail({ ticket, loadError = false }: { ticket: CustomerTicket | null; loadError?: boolean }) {
  const [downloadError, setDownloadError] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  async function download(attachment: CustomerTicketAttachment) {
    if (!ticket || downloading) return
    setDownloadError('')
    setDownloading(attachment.id)
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')
      const response = await fetch(`${base}/tickets/${encodeURIComponent(ticket.id)}/attachments/${encodeURIComponent(attachment.id)}`, { credentials: 'include' })
      if (!response.ok) throw new Error(`Download failed (${response.status})`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = attachment.fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setDownloadError('This attachment couldn’t be downloaded. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  if (!ticket) {
    return (
      <main style={styles.page}>
        <section style={styles.notFound} role={loadError ? 'alert' : 'status'}>
          <h1 style={styles.sectionTitle}>{loadError ? 'Ticket couldn’t be loaded.' : 'Ticket not found.'}</h1>
          <p style={styles.muted}>{loadError ? 'Try again later. No ticket details are available.' : 'This ticket may not exist or may not be available to your account.'}</p>
          <Link href="/tickets" style={styles.back}>Back to my tickets</Link>
        </section>
      </main>
    )
  }

  return (
    <main style={styles.page}>
      <Link href="/tickets" style={styles.back}>← Back to my tickets</Link>
      <article style={styles.card}>
        <header>
          <p style={styles.ref}>{displayReference(ticket.reference)}</p>
          <h1 style={styles.title}>{ticket.title}</h1>
          <div style={styles.summary}>
            <StatusBadge status={statusLabels[ticket.status] ?? 'New'} />
            <StatusBadge status={severityLabels[ticket.severity] ?? 'Low'} />
          </div>
          <p style={styles.muted}>Ticket status and details are managed by support.</p>
        </header>
        <hr style={styles.divider} />
        <section aria-labelledby="ticket-description-heading">
          <h2 id="ticket-description-heading" style={styles.sectionTitle}>Description</h2>
          <p style={styles.description}>{ticket.description}</p>
        </section>
        <hr style={styles.divider} />
        <section aria-label="Ticket timestamps">
          <div style={styles.metadata}>
            <span>Created <LocalTime value={ticket.createdAt} /></span>
            <span>Updated <LocalTime value={ticket.updatedAt} /></span>
          </div>
        </section>
        <hr style={styles.divider} />
        <section aria-labelledby="attachments-heading">
          <h2 id="attachments-heading" style={styles.sectionTitle}>Attachments</h2>
          {ticket.attachments.length === 0 ? <p style={styles.muted}>No attachments on this ticket.</p> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {ticket.attachments.map((attachment) => (
                <li key={attachment.id} style={styles.attachment}>
                  <div>
                    <strong>{attachment.fileName}</strong>
                    <div style={styles.muted}>{formatSize(attachment.sizeBytes)} · Uploaded by {attachment.uploader ?? attachment.uploadedById ?? 'Support team'}</div>
                  </div>
                  <button type="button" style={styles.download} onClick={() => void download(attachment)} disabled={downloading !== null}>
                    {downloading === attachment.id ? 'Downloading…' : 'Download'} <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>{attachment.fileName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {downloadError && <p role="alert" style={{ color: 'var(--sd-destructive)' }}>{downloadError}</p>}
        </section>
      </article>
    </main>
  )
}
