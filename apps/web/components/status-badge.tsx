import styles from './status-badge.module.css'

export type TicketStatus = 'New' | 'In Progress' | 'Resolved' | 'Closed'
export type TicketSeverity = 'Low' | 'Medium' | 'High'
export type CustomerStatus = 'Active' | 'Inactive'
export type BadgeValue = TicketStatus | TicketSeverity | CustomerStatus

export type StatusBadgeProps = {
  status: BadgeValue
  className?: string
}

const variantByStatus: Record<BadgeValue, string> = {
  New: styles.new,
  'In Progress': styles.inProgress,
  Resolved: styles.resolved,
  Closed: styles.closed,
  Low: styles.low,
  Medium: styles.medium,
  High: styles.high,
  Active: styles.active,
  Inactive: styles.inactive,
}

/** Text-labelled state indicator; color provides emphasis but never carries the meaning alone. */
export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${variantByStatus[status]}${className ? ` ${className}` : ''}`}>
      <span className={styles.marker} aria-hidden="true" />
      <span>{status}</span>
    </span>
  )
}
