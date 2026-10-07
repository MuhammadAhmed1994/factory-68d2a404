'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiError, apiRequest } from '../lib/api-client'
import AttachmentList, { type Attachment } from './attachment-list'
import TicketManagementPanel, { type ManagedTicket, type TicketSeverity } from './ticket-management-panel'
import type { TicketStatus } from './transition-control'
import styles from './admin-ticket-detail.module.css'

type AttachmentDto = {
  id: string
  fileName: string
  sizeBytes: number
  uploader?: string | { name?: string }
  uploaderName?: string
  uploadedByName?: string
  uploadedBy?: { name?: string }
  uploadedById?: string
}

type TicketDto = Omit<ManagedTicket, 'status' | 'severity'> & {
  status: TicketStatus | 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  severity: TicketSeverity | 'LOW' | 'MEDIUM' | 'HIGH'
  reference: string | number
  createdAt?: string
  customer?: { id?: string; name: string; email?: string }
  attachments?: AttachmentDto[]
}

const statuses: Record<string, TicketStatus> = {
  NEW: 'New', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed',
  New: 'New', 'In Progress': 'In Progress', Resolved: 'Resolved', Closed: 'Closed',
}
const severities: Record<string, TicketSeverity> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', Low: 'Low', Medium: 'Medium', High: 'High' }

function toAttachment(item: AttachmentDto): Attachment {
  const uploader = typeof item.uploader === 'string'
    ? item.uploader
    : item.uploader?.name ?? item.uploaderName ?? item.uploadedBy?.name ?? item.uploadedByName ?? 'Support team'
  return { id: item.id, fileName: item.fileName, sizeBytes: Number(item.sizeBytes), uploader }
}

function localTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AdminTicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<TicketDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    let active = true
    setTicket(null)
    setLoading(true)
    setNotFound(false)
    setLoadError(false)
    apiRequest<TicketDto>(`/tickets/${encodeURIComponent(ticketId)}`)
      .then((result) => { if (active) setTicket(result) })
      .catch((cause: unknown) => {
        if (!active) return
        if (cause instanceof ApiError && cause.status === 404) setNotFound(true)
        else setLoadError(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [ticketId, retry])

  async function upload(file: File): Promise<Attachment> {
    const body = new FormData()
    body.append('file', file)
    const result = await apiRequest<AttachmentDto>(`/tickets/${encodeURIComponent(ticketId)}/attachments`, { method: 'POST', body })
    return toAttachment(result)
  }

  async function download(attachment: Attachment) {
    setDownloadError('')
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')
    try {
      const response = await fetch(`${baseUrl}/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(attachment.id)}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Download rejected')
      const objectUrl = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = attachment.fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setDownloadError('This attachment could not be downloaded. Please try again.')
    }
  }

  if (loading) return <main className={styles.state}><p role="status">Loading ticket…</p><div className={styles.skeleton} aria-hidden="true" /><div className={styles.skeleton} aria-hidden="true" /></main>
  if (loadError) return <main className={styles.state}><Link href="/admin/tickets">← Back to tickets</Link><section className={styles.message} role="alert"><h1>Ticket couldn&apos;t be loaded. Try again.</h1><button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></section></main>
  if (notFound || !ticket) return <main className={styles.state}><Link href="/admin/tickets">← Back to tickets</Link><section className={styles.message} role="status"><h1>Ticket not found.</h1><p>This ticket may have been removed or you may not have access to it.</p></section></main>

  const managedTicket: ManagedTicket = {
    ...ticket,
    status: statuses[ticket.status] ?? 'New',
    severity: severities[ticket.severity] ?? 'Medium',
    customer: ticket.customer ? { name: ticket.customer.name } : undefined,
  }
  const attachments = (ticket.attachments ?? []).map(toAttachment)
  return (
    <div className={styles.detailPage}>
      <div className={styles.breadcrumb}><Link href="/admin/tickets">Tickets</Link><span aria-hidden="true">/</span><span>Ticket detail</span></div>
      <div className={styles.heading}><div><p className={styles.eyebrow}>Support tickets / Detail</p><h1>Ticket detail</h1><p>Review ticket information and manage its lifecycle.</p></div></div>
      <p className={styles.success} role="status"><strong>Ticket loaded.</strong> You’re viewing the latest saved details.</p>
      {downloadError && <p className={styles.downloadError} role="alert">{downloadError}</p>}
      <div className={styles.contentGrid}>
        <TicketManagementPanel ticket={managedTicket} onTicketChange={(next) => setTicket((current) => current ? { ...current, ...next } : current)} onDeleted={() => { window.location.assign('/admin/tickets') }} />
        <aside className={styles.attachments}>
          <AttachmentList
            attachments={attachments}
            onUpload={upload}
            onDownloadAttachment={download}
            label="Attachments"
            emptyMessage="No attachments on this ticket."
          />
          {ticket.createdAt && <p className={styles.localNote}>Ticket created {localTime(ticket.createdAt)}. Times are shown in your local time zone.</p>}
        </aside>
      </div>
    </div>
  )
}
