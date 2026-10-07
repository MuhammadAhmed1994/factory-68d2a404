'use client'

import { type FormEvent, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AttachmentList from './attachment-list'
import { ApiError, apiRequest } from '../lib/api-client'

type FieldName = 'title' | 'description' | 'severity'
type FieldErrors = Partial<Record<FieldName, string>>
type CreatedTicket = { id: string; reference?: string }

const fieldNames: FieldName[] = ['title', 'description', 'severity']

function serverFieldErrors(error: unknown): { fields: FieldErrors; upload: string; form: string } {
  const result: { fields: FieldErrors; upload: string; form: string } = { fields: {}, upload: '', form: '' }
  if (!(error instanceof ApiError)) {
    result.form = error instanceof Error ? error.message : 'Ticket could not be submitted. Please try again.'
    return result
  }

  const details = error.details
  if (details && typeof details === 'object') {
    const record = details as { field?: unknown; message?: unknown; errors?: unknown }
    if (typeof record.field === 'string' && fieldNames.includes(record.field as FieldName)) {
      result.fields[record.field as FieldName] = typeof record.message === 'string' ? record.message : error.message
    }
    if (record.errors && typeof record.errors === 'object') {
      for (const field of fieldNames) {
        const value = (record.errors as Record<string, unknown>)[field]
        if (typeof value === 'string') result.fields[field] = value
      }
    }
    if (Array.isArray(record.message)) {
      for (const message of record.message) {
        if (typeof message !== 'string') continue
        const field = fieldNames.find((candidate) => message.toLowerCase().includes(candidate))
        if (field) result.fields[field] = message
      }
    }
  }
  if (Object.keys(result.fields).length) return result
  if (/file|upload|attachment/i.test(error.message)) result.upload = error.message
  else result.form = error.message || 'Ticket could not be submitted. Please try again.'
  return result
}

export default function CustomerTicketCreate() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [uploadError, setUploadError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)

  function clearFieldError(field: FieldName) {
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setFormError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const nextErrors: FieldErrors = {}
    if (!title.trim()) nextErrors.title = 'Title is required.'
    if (!description.trim()) nextErrors.description = 'Description is required.'
    if (!severity) nextErrors.severity = 'Severity is required.'
    setErrors(nextErrors)
    setFormError('')
    setUploadError('')
    if (Object.keys(nextErrors).length) return

    inFlight.current = true
    setSubmitting(true)
    const payload = new FormData()
    payload.append('title', title.trim())
    payload.append('description', description.trim())
    payload.append('severity', severity)
    files.forEach((file) => payload.append('files', file, file.name))
    try {
      const ticket = await apiRequest<CreatedTicket>('/tickets', { method: 'POST', body: payload })
      router.push(`/tickets/${encodeURIComponent(ticket.id)}`)
    } catch (error) {
      const feedback = serverFieldErrors(error)
      setErrors(feedback.fields)
      setUploadError(feedback.upload)
      setFormError(feedback.form)
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <main style={{ width: 'min(100% - 32px, 720px)', margin: '0 auto', padding: '32px 0 56px' }}>
      <Link href="/tickets">← Back to my tickets</Link>
      <header style={{ margin: '22px 0 24px' }}>
        <p style={{ margin: '0 0 5px', color: 'var(--sd-muted-foreground)', fontSize: 12 }}>CUSTOMER SUPPORT</p>
        <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.3, fontWeight: 600 }}>Create a ticket</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--sd-muted-foreground)' }}>Your ticket starts as New and receives a sequential reference.</p>
      </header>

      <form onSubmit={submit} noValidate aria-busy={submitting} style={{ display: 'grid', gap: 22, padding: 24, border: '1px solid var(--sd-border)', borderRadius: 'var(--sd-radius-panel)', background: 'var(--sd-card)', boxShadow: 'var(--sd-shadow-panel)' }}>
        {formError && <p role="alert" style={{ margin: 0, color: 'var(--sd-destructive)' }}>{formError}</p>}
        <div style={{ display: 'grid', gap: 6 }}>
          <label htmlFor="ticket-title" style={{ fontWeight: 600 }}>Title <span aria-hidden="true">*</span></label>
          <input id="ticket-title" name="title" value={title} onChange={(event) => { setTitle(event.target.value); clearFieldError('title') }} required aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined} disabled={submitting} style={controlStyle(Boolean(errors.title))} />
          {errors.title && <span id="title-error" role="alert" style={errorStyle}>{errors.title}</span>}
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label htmlFor="ticket-description" style={{ fontWeight: 600 }}>Description <span aria-hidden="true">*</span></label>
          <textarea id="ticket-description" name="description" value={description} onChange={(event) => { setDescription(event.target.value); clearFieldError('description') }} required rows={5} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-error' : undefined} disabled={submitting} style={{ ...controlStyle(Boolean(errors.description)), resize: 'vertical', minHeight: 120 }} />
          {errors.description && <span id="description-error" role="alert" style={errorStyle}>{errors.description}</span>}
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label htmlFor="ticket-severity" style={{ fontWeight: 600 }}>Severity <span aria-hidden="true">*</span></label>
          <select id="ticket-severity" name="severity" value={severity} onChange={(event) => { setSeverity(event.target.value); clearFieldError('severity') }} required aria-invalid={Boolean(errors.severity)} aria-describedby={errors.severity ? 'severity-error' : 'severity-hint'} disabled={submitting} style={controlStyle(Boolean(errors.severity))}>
            <option value="">Select severity</option>
            <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
          </select>
          <span id="severity-hint" style={{ color: 'var(--sd-muted-foreground)', fontSize: 12 }}>Choose Low, Medium, or High severity.</span>
          {errors.severity && <span id="severity-error" role="alert" style={errorStyle}>{errors.severity}</span>}
        </div>
        <div>
          <AttachmentList onFilesChange={setFiles} uploaderName="You" label="Attachments" emptyMessage="No files selected." />
          {uploadError && <p role="alert" style={errorStyle}>{uploadError}</p>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button type="submit" disabled={submitting} style={{ minHeight: 42, padding: '0 18px', border: 0, borderRadius: 'var(--sd-radius-control)', background: 'var(--sd-primary)', color: '#fff', font: 'inherit', fontWeight: 600, cursor: submitting ? 'wait' : 'pointer' }}>
            {submitting ? 'Submitting…' : 'Submit ticket'}
          </button>
          {submitting && <span role="status">Submitting your ticket…</span>}
          <Link href="/tickets" aria-disabled={submitting} style={{ pointerEvents: submitting ? 'none' : undefined }}>Cancel</Link>
        </div>
      </form>
    </main>
  )
}

function controlStyle(invalid: boolean): React.CSSProperties {
  return {
    width: '100%', minHeight: 42, padding: '10px 12px', border: `1px solid ${invalid ? 'var(--sd-destructive)' : 'var(--sd-border)'}`,
    borderRadius: 'var(--sd-radius-control)', background: 'var(--sd-card)', color: 'var(--sd-foreground)', font: 'inherit',
  }
}

const errorStyle: React.CSSProperties = { margin: 0, color: 'var(--sd-destructive)', fontSize: 13 }
