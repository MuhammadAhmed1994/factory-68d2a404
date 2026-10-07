'use client'

import { useEffect, useRef } from 'react'

export type ConfirmationDialogProps = {
  open: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  pending?: boolean
  error?: string
}

export default function ConfirmationDialog({ open, onCancel, onConfirm, pending = false, error }: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCancel()
      if (event.key === 'Tab') {
        const dialog = cancelRef.current?.closest('[role="dialog"]')
        const buttons = dialog?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
        if (!buttons?.length) return
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [open, pending, onCancel])

  if (!open) return null
  return (
    <div className="confirmationBackdrop">
      <section role="dialog" aria-modal="true" aria-labelledby="delete-ticket-title" aria-describedby="delete-ticket-description" className="confirmationDialog">
        <h2 id="delete-ticket-title">Permanently delete ticket?</h2>
        <p id="delete-ticket-description">This permanently deletes the ticket and removes all of its attachments. This action cannot be undone.</p>
        {error && <p role="alert">{error}</p>}
        <div>
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={pending}>Cancel</button>
          <button type="button" onClick={() => void onConfirm()} disabled={pending}>
            {pending ? 'Deleting…' : 'Confirm permanent deletion'}
          </button>
        </div>
      </section>
    </div>
  )
}
