'use client'

import { useEffect, useRef } from 'react'
import styles from './ticket-management-panel.module.css'

type ConfirmationDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending?: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCancel()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus.current?.focus()
    }
  }, [open, pending, onCancel])

  if (!open) return null

  return (
    <div className={styles.dialogBackdrop}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" ref={dialogRef}>
        <h2 id="delete-dialog-title">{title}</h2>
        <p id="delete-dialog-description">{description}</p>
        {error && <p className={styles.dialogError} role="alert">{error}</p>}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={pending} ref={cancelRef}>Cancel</button>
          <button type="button" className={styles.dangerButton} onClick={onConfirm} disabled={pending}>{pending ? 'Deleting…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
