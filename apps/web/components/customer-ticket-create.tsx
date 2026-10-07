'use client'

import Link from 'next/link'
import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest, type ApiError } from '../lib/api-client'

type Severity = '' | 'Low' | 'Medium' | 'High'
type FieldErrors = Partial<Record<'title' | 'description' | 'severity', string>>

interface CreatedTicket {
  id: string
  reference: number | string
  status?: string
  attachments?: Array<{ id: string; fileName: string; sizeBytes: number; uploadedById?: string }>
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1 }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

function apiValidation(error: unknown): { fields: FieldErrors; upload: string; message: string } {
  const apiError = error as Partial<ApiError> | null
  const details = apiError?.details
  if (details && typeof details === 'object') {
    const payload = details as { fields?: unknown; errors?: unknown; message?: unknown }
    const source = payload.fields ?? payload.errors
    const fields: FieldErrors = {}
    let upload = ''
    if (source && typeof source === 'object') {
      for (const [key, value] of Object.entries(source)) {
        const text = Array.isArray(value) ? value.filter((part): part is string => typeof part === 'string').join(' ') : String(value)
        if (key === 'title' || key === 'description' || key === 'severity') fields[key] = text
        else upload = [upload, text].filter(Boolean).join(' ')
      }
    }
    const message = Array.isArray(payload.message)
      ? payload.message.filter((part): part is string => typeof part === 'string').join(' ')
      : typeof payload.message === 'string' ? payload.message : apiError?.message ?? ''
    if (!upload && /attach|upload|file/i.test(message)) upload = message
    return { fields, upload, message: fields.title || fields.description || fields.severity || upload ? '' : message }
  }
  return { fields: {}, upload: '', message: error instanceof Error ? error.message : 'Ticket couldn’t be submitted. Please try again.' }
}

const inputStyle = { width: '100%', minHeight: 42, padding: '10px 12px', border: '1px solid var(--sd-border)', borderRadius: 4, background: 'var(--sd-card)', color: 'var(--sd-foreground)', font: 'inherit' } as const
const labelStyle = { display: 'block', marginBottom: 6, fontWeight: 600 } as const
const fieldStyle = { display: 'grid', gap: 6 } as const

export default function CustomerTicketCreate() {
  const router = useRouter()
  const prefix = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>('')
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [uploadError, setUploadError] = useState('')
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? [])
    if (selected.length) setFiles((current) => [...current, ...selected])
    event.currentTarget.value = ''
    setUploadError('')
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const next: FieldErrors = {}
    if (!title.trim()) next.title = 'Title is required.'
    if (!description.trim()) next.description = 'Description is required.'
    if (!severity) next.severity = 'Severity is required.'
    setErrors(next)
    setUploadError('')
    setFormError('')
    if (Object.keys(next).length) return

    setPending(true)
    try {
      const body = new FormData()
      body.append('title', title.trim())
      body.append('description', description.trim())
      body.append('severity', severity)
      files.forEach((file) => body.append('attachments', file, file.name))
      const ticket = await apiRequest<CreatedTicket>('/tickets', { method: 'POST', body })
      router.push(`/tickets/${encodeURIComponent(ticket.id)}`)
    } catch (error) {
      const result = apiValidation(error)
      setErrors(result.fields)
      setUploadError(result.upload)
      setFormError(result.message || (!Object.keys(result.fields).length && !result.upload ? 'Ticket couldn’t be submitted. Review the details and try again.' : ''))
    } finally {
      setPending(false)
    }
  }

  const errorTextStyle = { margin: 0, color: 'var(--sd-destructive)', fontSize: 13 } as const

  return (
    <main style={{ width: 'min(100%, 920px)', margin: '0 auto', padding: '40px clamp(18px, 4vw, 40px)' }}>
      <p style={{ margin: '0 0 8px', color: 'var(--sd-muted-foreground)', fontSize: 13 }}>My tickets / New ticket</p>
      <h1 style={{ margin: '0 0 8px', fontSize: 24, lineHeight: '32px', fontWeight: 600 }}>Create a ticket</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--sd-muted-foreground)' }}>Your ticket starts as New and receives a sequential reference.</p>
      <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 20 }} aria-busy={pending}>
        {formError && <p role="alert" style={{ ...errorTextStyle, padding: 12, border: '1px solid currentColor', borderRadius: 4 }}>{formError}</p>}
        <div style={fieldStyle}>
          <label htmlFor={`${prefix}-title`} style={labelStyle}>Title <span aria-hidden="true" style={{ color: 'var(--sd-destructive)' }}>*</span></label>
          <input id={`${prefix}-title`} name="title" value={title} onChange={(event) => { setTitle(event.target.value); setErrors((current) => ({ ...current, title: '' })) }} required disabled={pending} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? `${prefix}-title-error` : undefined} style={{ ...inputStyle, borderColor: errors.title ? 'var(--sd-destructive)' : undefined }} />
          {errors.title && <p id={`${prefix}-title-error`} role="alert" style={errorTextStyle}>{errors.title}</p>}
        </div>
        <div style={fieldStyle}>
          <label htmlFor={`${prefix}-description`} style={labelStyle}>Description <span aria-hidden="true" style={{ color: 'var(--sd-destructive)' }}>*</span></label>
          <textarea id={`${prefix}-description`} name="description" value={description} onChange={(event) => { setDescription(event.target.value); setErrors((current) => ({ ...current, description: '' })) }} required rows={5} disabled={pending} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${prefix}-description-error` : undefined} style={{ ...inputStyle, minHeight: 120, resize: 'vertical', borderColor: errors.description ? 'var(--sd-destructive)' : undefined }} />
          {errors.description && <p id={`${prefix}-description-error`} role="alert" style={errorTextStyle}>{errors.description}</p>}
        </div>
        <div style={fieldStyle}>
          <label htmlFor={`${prefix}-severity`} style={labelStyle}>Severity <span aria-hidden="true" style={{ color: 'var(--sd-destructive)' }}>*</span></label>
          <select id={`${prefix}-severity`} name="severity" value={severity} onChange={(event) => { setSeverity(event.target.value as Severity); setErrors((current) => ({ ...current, severity: '' })) }} required disabled={pending} aria-invalid={Boolean(errors.severity)} aria-describedby={errors.severity ? `${prefix}-severity-error` : undefined} style={{ ...inputStyle, borderColor: errors.severity ? 'var(--sd-destructive)' : undefined }}>
            <option value="">Select severity</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
          </select>
          <span style={{ color: 'var(--sd-muted-foreground)', fontSize: 12 }}>Choose Low, Medium, or High severity.</span>
          {errors.severity && <p id={`${prefix}-severity-error`} role="alert" style={errorTextStyle}>{errors.severity}</p>}
        </div>
        <section aria-labelledby={`${prefix}-attachments`} style={{ padding: 20, border: '1px solid var(--sd-border)', borderRadius: 8, background: 'var(--sd-card)' }}>
          <h2 id={`${prefix}-attachments`} style={{ margin: '0 0 12px', fontSize: 18, lineHeight: '26px' }}>Attachments</h2>
          <label htmlFor={`${prefix}-files`} style={{ display: 'inline-flex', minHeight: 40, alignItems: 'center', padding: '0 14px', borderRadius: 4, background: 'var(--sd-primary)', color: '#fff', cursor: pending ? 'wait' : 'pointer', fontWeight: 600 }}>Choose files</label>
          <input ref={fileInput} id={`${prefix}-files`} type="file" multiple onChange={selectFiles} disabled={pending} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} aria-label="Choose attachments" />
          <p style={{ margin: '8px 0 0', color: 'var(--sd-muted-foreground)', fontSize: 12 }}>Select files to include with your ticket. No file type or size limits are specified.</p>
          {uploadError && <p role="alert" style={{ ...errorTextStyle, marginTop: 12 }}>{uploadError}</p>}
          {files.length === 0 ? <p style={{ margin: '16px 0 0', color: 'var(--sd-muted-foreground)' }}>No attachments selected.</p> : (
            <ul aria-label="Selected attachments" style={{ display: 'grid', gap: 8, margin: '16px 0 0', padding: 0, listStyle: 'none' }}>
              {files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid var(--sd-border)', borderRadius: 4 }}>
                <div style={{ minWidth: 0 }}><strong style={{ overflowWrap: 'anywhere' }}>{file.name}</strong><div style={{ color: 'var(--sd-muted-foreground)', fontSize: 12 }}>{formatSize(file.size)} · Uploaded by You · Selected</div></div>
                <button type="button" onClick={() => removeFile(index)} disabled={pending} aria-label={`Remove ${file.name}`} style={{ border: 0, background: 'transparent', color: 'var(--sd-primary)', cursor: pending ? 'wait' : 'pointer', textDecoration: 'underline', font: 'inherit', fontWeight: 600 }}>Remove</button>
              </li>)}
            </ul>
          )}
        </section>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          <button type="submit" disabled={pending} style={{ minHeight: 42, padding: '0 18px', border: 0, borderRadius: 4, background: 'var(--sd-primary)', color: '#fff', font: 'inherit', fontWeight: 600, cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1 }}>{pending ? 'Submitting…' : 'Submit ticket'}</button>
          <Link href="/tickets" aria-disabled={pending} style={{ pointerEvents: pending ? 'none' : undefined }}>Cancel</Link>
          {pending && <span role="status" aria-live="polite">Submitting your ticket…</span>}
        </div>
      </form>
    </main>
  )
}
