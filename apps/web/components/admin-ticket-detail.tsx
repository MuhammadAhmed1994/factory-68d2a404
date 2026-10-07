'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiRequest } from '../lib/api-client'
import AttachmentList, { type Attachment } from './attachment-list'
import TicketManagementPanel, { type ManagedTicket } from './ticket-management-panel'
import styles from './admin-ticket-detail.module.css'

export type AdminTicketAttachment = {
  id: string
  fileName: string
  sizeBytes: number
  mimeType?: string
  uploadedById?: string
  createdAt?: string
}

export type AdminTicket = Omit<ManagedTicket, 'customer'> & {
  customer?: ManagedTicket['customer'] & { id?: string }
  createdAt: string
  createdById?: string
  updatedById?: string | null
  attachments: AdminTicketAttachment[]
}

type DetailState = 'loading' | 'not-found' | 'error'

function uploaderName(attachment: AdminTicketAttachment, ticket: AdminTicket): string {
  if (attachment.uploadedById && attachment.uploadedById === ticket.customer?.id) {
    return ticket.customer.name ?? 'Customer'
  }
  return 'Administrator'
}

function formatReference(reference: number | string | undefined): string {
  if (reference === undefined) return 'Ticket'
  return typeof reference === 'number' ? `SD-${String(reference).padStart(4, '0')}` : reference
}

export default function AdminTicketDetail({
  ticket,
  state,
}: {
  ticket: AdminTicket | null
  state?: DetailState
}) {
  const router = useRouter()
  const [attachments, setAttachments] = useState<Attachment[]>(() => ticket
    ? ticket.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      sizeBytes: attachment.sizeBytes,
      uploader: uploaderName(attachment, ticket),
    }))
    : [])
  const [downloadError, setDownloadError] = useState('')

  async function uploadAttachment(file: File): Promise<Attachment> {
    if (!ticket) throw new Error('Ticket is not available.')
    const body = new FormData()
    body.append('file', file)
    const uploaded = await apiRequest<AdminTicketAttachment>(`/tickets/${encodeURIComponent(ticket.id)}/attachments`, {
      method: 'POST',
      body,
    })
    const result = {
      id: uploaded.id,
      fileName: uploaded.fileName,
      sizeBytes: uploaded.sizeBytes,
      uploader: 'Administrator',
    }
    setAttachments((current) => [...current, result])
    return result
  }

  async function downloadAttachment(attachment: Attachment) {
    if (!ticket) return
    setDownloadError('')
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')
      const response = await fetch(`${base}/tickets/${encodeURIComponent(ticket.id)}/attachments/${encodeURIComponent(attachment.id)}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error(`Download failed (${response.status})`)
      const objectUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = attachment.fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setDownloadError('This attachment couldn’t be downloaded. Please try again.')
    }
  }

  if (!ticket) {
    const loading = state === 'loading'
    const notFound = state === 'not-found'
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard} role={loading ? 'status' : notFound ? 'status' : 'alert'}>
          <h1>{loading ? 'Loading ticket…' : notFound ? 'Ticket not found.' : 'Ticket couldn’t be loaded.'}</h1>
          {loading ? (
            <div className={styles.skeleton} aria-hidden="true"><span /><span /><span /></div>
          ) : (
            <>
              <p>{notFound ? 'This ticket may not exist or may not be available.' : 'Try again. No ticket details are available.'}</p>
              <Link href="/admin/tickets">Back to tickets</Link>
              {!notFound && <button type="button" onClick={() => router.refresh()}>Try again</button>}
            </>
          )}
        </section>
      </main>
    )
  }

  const managedTicket: ManagedTicket = {
    ...ticket,
    customer: ticket.customer,
  }

  return (
    <div className={styles.detailPage}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin/tickets">Tickets</Link><span aria-hidden="true"> / </span><span aria-current="page">{formatReference(ticket.reference)}</span>
      </nav>
      <div className={styles.contentGrid}>
        <div className={styles.managementPanel}>
          <TicketManagementPanel ticket={managedTicket} onDeleted={() => router.push('/admin/tickets')} />
        </div>
        <aside className={styles.attachmentsPanel} aria-label="Ticket attachments">
          <AttachmentList
            attachments={attachments}
            onUpload={async (file, onProgress) => {
              const uploaded = await uploadAttachment(file)
              onProgress(100)
              return uploaded
            }}
            onDownloadAttachment={downloadAttachment}
            label="Attachments"
            emptyMessage="No attachments on this ticket."
            uploaderName="Administrator"
          />
          {downloadError && <p className={styles.downloadError} role="alert">{downloadError}</p>}
        </aside>
      </div>
    </div>
  )
}
