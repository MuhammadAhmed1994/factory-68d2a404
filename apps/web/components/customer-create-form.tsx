'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest, ApiError } from '../lib/api-client'
import styles from './record-form.module.css'

type CustomerRecord = { id: string }
type FieldErrors = { name?: string; email?: string }

function mapValidationErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {}
  const details = error.details
  const messages = details && typeof details === 'object' && 'message' in details
    ? (details as { message?: unknown }).message
    : undefined
  const messageList = Array.isArray(messages) ? messages : typeof messages === 'string' ? [messages] : []
  const mapped: FieldErrors = {}
  for (const entry of messageList) {
    if (typeof entry !== 'string') continue
    const normalized = entry.toLowerCase()
    if (normalized.includes('email')) mapped.email = entry
    if (normalized.includes('name')) mapped.name = entry
  }
  if (!Object.keys(mapped).length && error.status === 409) mapped.email = error.message
  return mapped
}

export default function CustomerCreateForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const pendingRef = useRef(false)
  const nameId = 'new-customer-name'
  const emailId = 'new-customer-email'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current) return

    const nextErrors: FieldErrors = {}
    if (!name.trim()) nextErrors.name = 'Name is required.'
    if (!email.trim()) nextErrors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.'
    setErrors(nextErrors)
    setFormError('')
    setSuccess(false)
    if (Object.keys(nextErrors).length) return

    pendingRef.current = true
    setPending(true)
    try {
      const customer = await apiRequest<CustomerRecord>('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      setSuccess(true)
      router.push(`/admin/customers/${encodeURIComponent(customer.id)}`)
    } catch (error) {
      const serverFields = mapValidationErrors(error)
      setErrors(serverFields)
      setFormError(error instanceof ApiError
        ? 'Customer couldn’t be created. Review the highlighted fields and try again.'
        : 'Customer couldn’t be created. Please try again.')
      if (error instanceof ApiError && !Object.keys(serverFields).length) {
        setErrors({ name: error.message, email: error.message })
      }
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const inputClass = (field: keyof FieldErrors) => `${styles.control}${errors[field] ? ` ${styles.invalid}` : ''}`

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {formError && <div className={styles.formError} role="alert">{formError}</div>}
      {success && <p className={styles.success} role="status">Customer created.</p>}
      <div className={styles.field}>
        <label className={styles.label} htmlFor={nameId}>Name <span aria-hidden="true">*</span></label>
        <input
          className={inputClass('name')}
          id={nameId}
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => { setName(event.target.value); setErrors((current) => ({ ...current, name: undefined })); setFormError('') }}
          disabled={pending}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
        />
        {errors.name && <span id={`${nameId}-error`} className={styles.fieldError} role="alert">{errors.name}</span>}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={emailId}>Email <span aria-hidden="true">*</span></label>
        <input
          className={inputClass('email')}
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => { setEmail(event.target.value); setErrors((current) => ({ ...current, email: undefined })); setFormError('') }}
          disabled={pending}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
        />
        {errors.email && <span id={`${emailId}-error`} className={styles.fieldError} role="alert">{errors.email}</span>}
      </div>
      <div className={styles.actions}>
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? 'Creating customer…' : 'Create customer'}
        </button>
        <a href="/admin/customers" style={{ display: 'inline-flex', minHeight: 42, alignItems: 'center', padding: '0 14px', border: '1px solid var(--sd-border)', borderRadius: 'var(--sd-radius-control)', background: 'var(--sd-card)', color: 'var(--sd-foreground)', fontWeight: 600, textDecoration: 'none', pointerEvents: pending ? 'none' : 'auto' }} aria-disabled={pending}>
          Cancel
        </a>
      </div>
    </form>
  )
}
