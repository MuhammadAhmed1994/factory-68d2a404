'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from './status-badge'
import { ApiError, apiRequest } from '../lib/api-client'

type AttachmentRecord = {
  id: string
  fileName: string
  sizeBytes: number
  uploader?: string | { name?: string }
  uploadedBy?: { name?: string }
  uploadedByName?: string
}

type CustomerTicket = {
  id: string
  reference: string
  title: string
  description: string
  status: 'New' | 'In Progress' | 'Resolved' | 'Closed'
  severity: 'Low' | 'Medium' | 'High'
  createdAt: string
  updatedAt: string
  attachments?: AttachmentRecord[]
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1 }
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[unit]}`
}

function uploaderName(attachment: AttachmentRecord): string {
  if (typeof attachment.uploader === 'string') return attachment.uploader
  return attachment.uploader?.name ?? attachment.uploadedBy?.name ?? attachment.uploadedByName ?? 'Support team'
}

export default function CustomerTicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<CustomerTicket | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    setError(false)
    setTicket(null)
    apiRequest<CustomerTicket>(`/tickets/${encodeURIComponent(ticketId)}`)
      .then((result) => { if (active) setTicket(result) })
      .catch((cause: unknown) => {
        if (!active) return
        if (cause instanceof ApiError && cause.status === 404) setNotFound(true)
        else setError(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [ticketId, retry])

  async function download(attachment: AttachmentRecord) {
    setDownloadError('')
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')
    try {
      const response = await fetch(`${base}/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(attachment.id)}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Download rejected')
      const objectUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = attachment.fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setDownloadError('This attachment could not be downloaded. Please try again.')
    }
  }

  if (loading) return <main style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}><p role="status">Loading ticket…</p></main>
  if (error) return <main style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}><Link href="/tickets">← Back to my tickets</Link><p role="alert">Ticket couldn&apos;t be loaded. Try again. <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p></main>
  if (notFound || !ticket) return <main style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}><Link href="/tickets">← Back to my tickets</Link><section role="status" style={{ marginTop: 24, padding: 24, background: 'var(--sd-card)', border: '1px solid var(--sd-border)', borderRadius: 8 }}><h1 style={{ marginTop: 0 }}>Ticket not found.</h1><p>This ticket may have been removed or you may not have access to it.</p></section></main>

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 48px' }}>
      <Link href="/tickets">← Back to my tickets</Link>
      <header style={{ margin: '22px 0 24px' }}>
        <p style={{ margin: '0 0 4px', color: 'var(--sd-muted-foreground)', fontFamily: 'IBM Plex Mono, monospace' }}>{ticket.reference}</p>
        <h1 style={{ margin: '0 0 14px', fontSize: 26, lineHeight: 1.3 }}>{ticket.title}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}><StatusBadge status={ticket.status} /><StatusBadge status={ticket.severity} /></div>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 20 }}>
        <section aria-labelledby="description-heading" style={{ padding: 22, border: '1px solid var(--sd-border)', borderRadius: 8, background: 'var(--sd-card)' }}>
          <h2 id="description-heading" style={{ margin: '0 0 12px', fontSize: 18 }}>Description</h2>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{ticket.description}</p>
          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 16, rowGap: 8, margin: '24px 0 0', paddingTop: 16, borderTop: '1px solid var(--sd-border)', fontSize: 13 }}>
            <dt style={{ color: 'var(--sd-muted-foreground)' }}>Created</dt><dd style={{ margin: 0 }}><time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time></dd>
            <dt style={{ color: 'var(--sd-muted-foreground)' }}>Updated</dt><dd style={{ margin: 0 }}><time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt)}</time></dd>
          </dl>
        </section>
        <section aria-labelledby="attachments-heading" style={{ padding: 22, border: '1px solid var(--sd-border)', borderRadius: 8, background: 'var(--sd-card)' }}>
          <h2 id="attachments-heading" style={{ margin: '0 0 12px', fontSize: 18 }}>Attachments</h2>
          {downloadError && <p role="alert">{downloadError}</p>}
          {ticket.attachments?.length ? <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>{ticket.attachments.map((attachment) => <li key={attachment.id} style={{ padding: '12px 0', borderTop: '1px solid var(--sd-border)' }}>
            <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{attachment.fileName}</strong>
            <span style={{ display: 'block', color: 'var(--sd-muted-foreground)', fontSize: 12 }}>{formatSize(attachment.sizeBytes)} · Uploaded by {uploaderName(attachment)}</span>
            <button type="button" onClick={() => void download(attachment)} style={{ marginTop: 8, border: 0, padding: 0, background: 'none', color: 'var(--sd-primary)', cursor: 'pointer', textDecoration: 'underline' }}>Download <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>{attachment.fileName}</span></button>
          </li>)}</ul> : <p style={{ margin: 0, color: 'var(--sd-muted-foreground)' }}>No attachments on this ticket.</p>}
        </section>
      </div>
      <p style={{ marginTop: 20, color: 'var(--sd-muted-foreground)', fontSize: 13 }}>This ticket belongs to your account. Ticket status and details are managed by support.</p>
    </main>
  )
}
