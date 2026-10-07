'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import ConfirmationDialog from './confirmation-dialog'
import TransitionControl, { type TicketStatus } from './transition-control'
import styles from './ticket-management-panel.module.css'

export type TicketSeverity = 'Low' | 'Medium' | 'High'

export type ManagedTicket = {
  id: string
  reference?: string | number
  title: string
  description: string
  severity: TicketSeverity
  status: TicketStatus
  updatedAt?: string
  updatedBy?: string
  customer?: { name: string }
}

type TicketManagementPanelProps = {
  ticket: ManagedTicket
  onTicketChange?: (ticket: ManagedTicket) => void
  onDeleted?: () => void
}

const severityToApi: Record<TicketSeverity, string> = { Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH' }
const severityFromApi: Record<string, TicketSeverity> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }

export default function TicketManagementPanel({ ticket, onTicketChange, onDeleted }: TicketManagementPanelProps) {
  const [current, setCurrent] = useState(ticket)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(ticket.title)
  const [description, setDescription] = useState(ticket.description)
  const [severity, setSeverity] = useState<TicketSeverity>(ticket.severity)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  function updateTicket(next: ManagedTicket) {
    setCurrent(next)
    onTicketChange?.(next)
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEditError('')
    setSaved(false)
    const errors = [!title.trim() ? 'Enter a ticket title.' : '', !description.trim() ? 'Enter a description.' : ''].filter(Boolean)
    if (errors.length) {
      setEditError(errors.join(' '))
      return
    }
    setSaving(true)
    try {
      const result = await apiRequest<Partial<ManagedTicket> & { severity?: string }>(`/tickets/${encodeURIComponent(current.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: title.trim(), description: description.trim(), severity: severityToApi[severity] }),
      })
      const next: ManagedTicket = {
        ...current,
        ...result,
        severity: result.severity ? severityFromApi[result.severity] ?? result.severity as TicketSeverity : severity,
        title: result.title ?? title.trim(),
        description: result.description ?? description.trim(),
      }
      updateTicket(next)
      setTitle(next.title)
      setDescription(next.description)
      setSeverity(next.severity)
      setEditing(false)
      setSaved(true)
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Unable to save ticket details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTicket() {
    setDeleting(true)
    setDeleteError('')
    try {
      await apiRequest<void>(`/tickets/${encodeURIComponent(current.id)}`, { method: 'DELETE' })
      setConfirmOpen(false)
      onDeleted?.()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete this ticket. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Support tickets / Detail</p>
          <h1>Ticket detail</h1>
          <p className={styles.intro}>Review ticket information and manage its lifecycle.</p>
        </div>
      </header>

      <section className={styles.summary} aria-labelledby="managed-ticket-title">
        <div className={styles.summaryTop}>
          <div className={styles.ticketTitleArea}>
            <span className={styles.reference}>{current.reference ? `SD-${String(current.reference).replace(/^SD-/, '').padStart(4, '0')}` : `Ticket ${current.id}`}</span>
            <h2 id="managed-ticket-title">{current.title}</h2>
            {current.customer && <p className={styles.customerLine}>Customer: {current.customer.name}</p>}
          </div>
          <TransitionControl ticketId={current.id} status={current.status} onStatusChange={(status) => updateTicket({ ...current, status })} />
        </div>
        <dl className={styles.summaryDetails}>
          <div><dt>Severity</dt><dd>{current.severity}</dd></div>
          <div><dt>Status</dt><dd>{current.status}</dd></div>
          {current.updatedBy && <div><dt>Last updated by</dt><dd>{current.updatedBy}</dd></div>}
          {current.updatedAt && <div><dt>Updated</dt><dd><time dateTime={current.updatedAt}>{new Date(current.updatedAt).toLocaleString()}</time></dd></div>}
        </dl>
      </section>

      {saved && <p className={styles.success} role="status">Ticket details saved successfully.</p>}
      <section className={styles.contentCard} aria-labelledby="description-heading">
        <div className={styles.cardHeading}>
          <div><h2 id="description-heading">Description</h2><p>Ticket details and customer-provided information.</p></div>
          {!editing && <button className={styles.secondaryButton} type="button" onClick={() => { setEditError(''); setEditing(true) }}>Edit ticket</button>}
        </div>
        {editing ? (
          <form className={styles.editForm} onSubmit={(event) => void saveDetails(event)} noValidate>
            {editError && <p className={styles.error} role="alert">{editError}</p>}
            <div className={styles.field}>
              <label htmlFor="ticket-title">Title</label>
              <input id="ticket-title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={saving} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="ticket-description">Description</label>
              <textarea id="ticket-description" value={description} onChange={(event) => setDescription(event.target.value)} disabled={saving} rows={5} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="ticket-severity">Severity</label>
              <select id="ticket-severity" value={severity} onChange={(event) => setSeverity(event.target.value as TicketSeverity)} disabled={saving}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              <button className={styles.secondaryButton} type="button" disabled={saving} onClick={() => { setEditing(false); setTitle(current.title); setDescription(current.description); setSeverity(current.severity) }}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className={styles.descriptionContent}>
            <p className={styles.overline}>Issue details</p>
            <p className={styles.description}>{current.description}</p>
          </div>
        )}
      </section>

      <section className={styles.danger} aria-labelledby="delete-ticket-heading">
        <div><h2 id="delete-ticket-heading">Delete this ticket</h2><p>Deleting permanently removes this ticket and all of its attachments. This action cannot be undone.</p></div>
        <button type="button" className={styles.dangerButton} onClick={() => { setDeleteError(''); setConfirmOpen(true) }}>Delete ticket</button>
      </section>
      {deleteError && <p className={styles.error} role="alert">{deleteError}</p>}
      <p className={styles.auditNote}>Edits and status changes record the administrator and time. Times are shown in your local time zone.</p>

      <ConfirmationDialog
        open={confirmOpen}
        title="Permanently delete ticket?"
        description="This permanently deletes the ticket and removes all of its attachments. This action cannot be undone."
        confirmLabel="Permanently delete ticket"
        pending={deleting}
        error={deleteError}
        onCancel={() => { if (!deleting) setConfirmOpen(false) }}
        onConfirm={() => void deleteTicket()}
      />
    </main>
  )
}
