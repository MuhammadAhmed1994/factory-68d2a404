'use client'

import type { TicketStatus } from './status-badge'

type StatusValue = TicketStatus | 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

const labels: Record<StatusValue, TicketStatus> = {
  New: 'New', 'In Progress': 'In Progress', Resolved: 'Resolved', Closed: 'Closed',
  NEW: 'New', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed',
}
const transitions: Record<TicketStatus, TicketStatus[]> = {
  New: ['In Progress'],
  'In Progress': ['Resolved'],
  Resolved: ['In Progress', 'Closed'],
  Closed: [],
}

export type TransitionControlProps = {
  status: StatusValue
  onTransition: (status: TicketStatus) => void | Promise<void>
  pending?: boolean
  error?: string
}

/** Renders buttons only for transitions present in the ticket lifecycle graph. */
export default function TransitionControl({ status, onTransition, pending = false, error }: TransitionControlProps) {
  const current = labels[status]
  const nextStatuses = transitions[current]
  if (nextStatuses.length === 0) {
    return <p aria-label="Status transition" className="transitionReadOnly">Closed tickets have no available status transitions.</p>
  }

  return (
    <section aria-label="Permitted status transitions">
      <p className="transitionLabel">Change status from {current}</p>
      <div className="transitionActions">
        {nextStatuses.map((next) => (
          <button key={next} type="button" onClick={() => void onTransition(next)} disabled={pending}>
            {pending ? 'Saving…' : `Move to ${next}`}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
