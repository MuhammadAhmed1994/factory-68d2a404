'use client'

import { useState } from 'react'
import { apiRequest } from '../lib/api-client'
import styles from './ticket-management-panel.module.css'

export type TicketStatus = 'New' | 'In Progress' | 'Resolved' | 'Closed'

const transitions: Record<TicketStatus, TicketStatus[]> = {
  New: ['In Progress'],
  'In Progress': ['Resolved'],
  Resolved: ['In Progress', 'Closed'],
  Closed: [],
}
const statusToApi: Record<TicketStatus, string> = { New: 'NEW', 'In Progress': 'IN_PROGRESS', Resolved: 'RESOLVED', Closed: 'CLOSED' }

export default function TransitionControl({
  ticketId,
  status,
  onStatusChange,
}: {
  ticketId: string
  status: TicketStatus
  onStatusChange?: (status: TicketStatus) => void
}) {
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | null>(null)
  const [error, setError] = useState('')
  const options = transitions[status] ?? []

  async function transition(nextStatus: TicketStatus) {
    if (!options.includes(nextStatus) || pendingStatus) return
    setPendingStatus(nextStatus)
    setError('')
    try {
      await apiRequest(`/tickets/${encodeURIComponent(ticketId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusToApi[nextStatus] }),
      })
      onStatusChange?.(nextStatus)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to change ticket status. Please try again.')
    } finally {
      setPendingStatus(null)
    }
  }

  return (
    <div className={styles.transitionArea}>
      <span className={styles.transitionLabel}>Change status</span>
      {options.length ? (
        <div className={styles.transitionButtons} aria-label="Permitted status transitions">
          {options.map((nextStatus) => (
            <button
              className={styles.transitionButton}
              type="button"
              key={nextStatus}
              disabled={pendingStatus !== null}
              onClick={() => void transition(nextStatus)}
              aria-label={`Change to ${nextStatus}`}
            >
              {pendingStatus === nextStatus ? 'Saving…' : nextStatus === 'Closed' ? 'Close ticket' : nextStatus}
            </button>
          ))}
        </div>
      ) : <p className={styles.noTransition}>No status changes are available.</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  )
}
