'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import type { TicketSeverity, TicketStatus } from './status-badge'
import ConfirmationDialog from './confirmation-dialog'
import styles from './ticket-management-panel.module.css'
import TransitionControl from './transition-control'

type TicketStatusValue = TicketStatus | 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
type TicketSeverityValue = TicketSeverity | 'LOW' | 'MEDIUM' | 'HIGH'

export type ManagedTicket = {
  id: string
  reference?: number | string
  title: string
  description: string
  severity: TicketSeverityValue
  status: TicketStatusValue
  updatedAt?: string
  updatedBy?: string
  updatedById?: string | null
  customer?: { name?: string; email?: string }
}

export type TicketManagementPanelProps = {
  ticket: ManagedTicket
  onDeleted?: () => void
}

const severityNames: Record<string, TicketSeverity> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', Low: 'Low', Medium: 'Medium', High: 'High' }
const statusNames: Record<string, TicketStatus> = { NEW: 'New', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', New: 'New', 'In Progress': 'In Progress', Resolved: 'Resolved', Closed: 'Closed' }

function formatReference(reference: number | string | undefined) {
  if (reference === undefined) return 'Ticket'
  return typeof reference === 'number' ? `SD-${String(reference).padStart(4, '0')}` : reference
}

function localTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function TicketManagementPanel({ ticket: initialTicket, onDeleted }: TicketManagementPanelProps) {
  const [ticket, setTicket] = useState(initialTicket)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(initialTicket.title)
  const [description, setDescription] = useState(initialTicket.description)
  const [severity, setSeverity] = useState(severityNames[initialTicket.severity] ?? 'Low')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [transitionError, setTransitionError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function saveTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Title is required.'
    if (!description.trim()) errors.description = 'Description is required.'
    if (Object.keys(errors).length) { setFieldErrors(errors); setFeedback(''); return }
    setFieldErrors({})
    setFeedback('')
    setSaving(true)
    try {
      const updated = await apiRequest<Partial<ManagedTicket>>(`/tickets/${encodeURIComponent(ticket.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: title.trim(), description: description.trim(), severity: severity.toUpperCase() }),
      })
      setTicket((current) => ({ ...current, ...updated, title: updated.title ?? title.trim(), description: updated.description ?? description.trim(), severity: (updated.severity as TicketSeverityValue | undefined) ?? severity }))
      setTitle(updated.title ?? title.trim())
      setDescription(updated.description ?? description.trim())
      setSeverity(severityNames[updated.severity ?? ''] ?? severity)
      setFeedback('Ticket details saved. The update records the administrator and time.')
      setEditing(false)
    } catch (error) {
      const details = error && typeof error === 'object' && 'details' in error ? error.details : undefined
      if (details && typeof details === 'object' && 'errors' in details && details.errors && typeof details.errors === 'object') {
        setFieldErrors(details.errors as Record<string, string>)
      } else {
        setFeedback(error instanceof Error ? error.message : 'Unable to save ticket. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(nextStatus: TicketStatus) {
    setTransitioning(true)
    setTransitionError('')
    try {
      await apiRequest(`/tickets/${encodeURIComponent(ticket.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus.toUpperCase().replaceAll(' ', '_') }),
      })
      setTicket((current) => ({ ...current, status: nextStatus }))
    } catch (error) {
      setTransitionError(error instanceof Error ? error.message : 'Unable to change ticket status. Please try again.')
    } finally {
      setTransitioning(false)
    }
  }

  async function deleteTicket() {
    setDeleting(true)
    setDeleteError('')
    try {
      await apiRequest(`/tickets/${encodeURIComponent(ticket.id)}`, { method: 'DELETE' })
      setConfirmDelete(false)
      onDeleted?.()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete this ticket. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className={styles.panel}>
      <header className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>Support tickets / Detail</p>
          <h1>Ticket detail</h1>
          <p className={styles.headingNote}>Review ticket information and manage its lifecycle.</p>
        </div>
        {!editing && <button className={styles.primaryButton} type="button" onClick={() => { setFeedback(''); setEditing(true) }}>Edit ticket</button>}
      </header>

      <section className={styles.summary} aria-label="Ticket summary">
        <div className={styles.summaryTop}>
          <div>
            <p className={styles.reference}>{formatReference(ticket.reference)}</p>
            <h2>{ticket.title}</h2>
            <p className={styles.customer}>{ticket.customer?.name ? `Customer: ${ticket.customer.name}` : 'Support ticket'}</p>
          </div>
          <TransitionControl status={ticket.status} onTransition={changeStatus} pending={transitioning} error={transitionError} />
        </div>
        <div className={styles.details}>
          <div><span>Severity</span><strong>{severityNames[ticket.severity] ?? ticket.severity}</strong></div>
          <div><span>Status</span><strong>{statusNames[ticket.status] ?? ticket.status}</strong></div>
          {ticket.customer?.email && <div><span>Customer email</span><strong>{ticket.customer.email}</strong></div>}
        </div>
      </section>

      {feedback && <p className={styles.feedback} role={feedback.includes('saved') ? 'status' : 'alert'}>{feedback}</p>}

      <section className={styles.contentCard} aria-labelledby="description-heading">
        <div className={styles.cardHeading}><div><h2 id="description-heading">Description and ticket details</h2><p>Edits and status changes record the administrator and time.</p></div></div>
        {editing ? (
          <form className={styles.form} onSubmit={saveTicket} noValidate>
            <div className={styles.field}>
              <label htmlFor="ticket-title">Title</label>
              <input id="ticket-title" value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'ticket-title-error' : undefined} />
              {fieldErrors.title && <span id="ticket-title-error" role="alert">{fieldErrors.title}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="ticket-description">Description</label>
              <textarea id="ticket-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? 'ticket-description-error' : undefined} />
              {fieldErrors.description && <span id="ticket-description-error" role="alert">{fieldErrors.description}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="ticket-severity">Severity</label>
              <select id="ticket-severity" value={severity} onChange={(event) => setSeverity(event.target.value as TicketSeverity)}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
              {fieldErrors.severity && <span role="alert">{fieldErrors.severity}</span>}
            </div>
            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              <button className={styles.secondaryButton} type="button" disabled={saving} onClick={() => { setEditing(false); setTitle(ticket.title); setDescription(ticket.description); setSeverity(severityNames[ticket.severity] ?? 'Low'); setFieldErrors({}) }}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className={styles.descriptionContent}>
            <p className={styles.overline}>Issue details</p>
            <p className={styles.description}>{ticket.description}</p>
            <p className={styles.metadata}>Last updated {localTime(ticket.updatedAt)}{ticket.updatedBy ? ` · ${ticket.updatedBy}` : ticket.updatedById ? ` · Admin ${ticket.updatedById}` : ''}</p>
          </div>
        )}
      </section>

      <section className={styles.deleteSection} aria-labelledby="delete-heading">
        <div><h2 id="delete-heading">Delete this ticket</h2><p>Deleting permanently removes this ticket and all of its attachments. This action cannot be undone.</p></div>
        <button className={styles.dangerButton} type="button" onClick={() => { setDeleteError(''); setConfirmDelete(true) }}>Delete ticket</button>
      </section>
      <p className={styles.footerNote}>Times are shown in your local time zone.</p>
      <ConfirmationDialog open={confirmDelete} onCancel={() => setConfirmDelete(false)} onConfirm={deleteTicket} pending={deleting} error={deleteError} />
    </main>
  )
}
