'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiRequest, ApiError } from '../lib/api-client'
import styles from './record-form.module.css'

type Customer = { id: string; name: string; email?: string; isActive?: boolean }
type CustomersResponse = { customers: Customer[] }
type CreatedTicket = { id: string; reference: number | string; status?: string }
type Values = { customerId: string; title: string; description: string; severity: string }
type FieldName = keyof Values
type FieldErrors = Partial<Record<FieldName, string>>

const requiredFields: Array<{ name: FieldName; label: string }> = [
  { name: 'customerId', label: 'Customer' },
  { name: 'title', label: 'Title' },
  { name: 'description', label: 'Description' },
  { name: 'severity', label: 'Severity' },
]

function ticketReference(value: number | string): string {
  const digits = String(value).replace(/^SD-/, '')
  return `SD-${digits.padStart(4, '0')}`
}

function fieldFor(value: string): FieldName | undefined {
  const text = value.toLowerCase()
  return /customer|customerid/.test(text) ? 'customerId'
    : /title/.test(text) ? 'title'
      : /description/.test(text) ? 'description'
        : /severity/.test(text) ? 'severity' : undefined
}

function serverFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') return {}
  const details = error.details as { field?: unknown; message?: unknown; errors?: unknown }
  const messages = Array.isArray(details.message) ? details.message : [details.message]
  const explicitField = typeof details.field === 'string' ? fieldFor(details.field) : undefined
  const mapped: FieldErrors = {}

  for (const entry of messages) {
    if (typeof entry !== 'string') continue
    const field = fieldFor(entry) ?? explicitField
    if (field) mapped[field] = entry
  }
  if (details.errors && typeof details.errors === 'object') {
    for (const [key, value] of Object.entries(details.errors)) {
      const field = fieldFor(key)
      if (field) mapped[field] = Array.isArray(value) ? value.join(', ') : String(value)
    }
  }
  if (error.status === 400 && !Object.keys(mapped).length) mapped.customerId = error.message
  return mapped
}

export default function AdminTicketCreate() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [customersError, setCustomersError] = useState(false)
  const [values, setValues] = useState<Values>({ customerId: '', title: '', description: '', severity: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState('')
  const pendingRef = useRef(false)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setCustomersLoading(true)
    setCustomersError(false)
    apiRequest<CustomersResponse | Customer[]>('/customers')
      .then((response) => {
        if (!active) return
        const list = Array.isArray(response) ? response : response.customers
        setCustomers(list)
        setCustomersLoading(false)
      })
      .catch(() => {
        if (!active) return
        setCustomersError(true)
        setCustomersLoading(false)
      })
    return () => { active = false }
  }, [loadAttempt])

  function updateValue(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
    setSuccess('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current) return
    const nextErrors: FieldErrors = {}
    requiredFields.forEach(({ name, label }) => {
      if (!values[name].trim()) nextErrors[name] = `${label} is required.`
    })
    setErrors(nextErrors)
    setFormError('')
    setSuccess('')
    if (Object.keys(nextErrors).length) return

    pendingRef.current = true
    setPending(true)
    try {
      const ticket = await apiRequest<CreatedTicket>('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          customerId: values.customerId,
          title: values.title.trim(),
          description: values.description.trim(),
          severity: values.severity,
        }),
      })
      const reference = ticketReference(ticket.reference)
      setSuccess(`Ticket ${reference} created with New status.`)
      router.push(`/admin/tickets/${encodeURIComponent(ticket.id)}`)
    } catch (error) {
      const fieldErrors = serverFieldErrors(error)
      setErrors(fieldErrors)
      setFormError('Ticket couldn’t be created. Review the highlighted fields and try again.')
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const id = (name: FieldName) => `new-ticket-${name}`
  const controlClass = (name: FieldName) => `${styles.control}${errors[name] ? ` ${styles.invalid}` : ''}`

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {formError && <div className={styles.formError} role="alert">{formError}</div>}
      {success && <p className={styles.success} role="status" aria-live="polite">{success}</p>}
      <div className={styles.field}>
        <label className={styles.label} htmlFor={id('customerId')}>Customer <span aria-hidden="true">*</span></label>
        <select
          id={id('customerId')}
          name="customerId"
          className={controlClass('customerId')}
          value={values.customerId}
          onChange={(event) => updateValue('customerId', event.target.value)}
          required
          disabled={pending || customersLoading || customersError}
          aria-invalid={Boolean(errors.customerId)}
          aria-describedby={errors.customerId ? `${id('customerId')}-error` : undefined}
        >
          <option value="">{customersLoading ? 'Loading customers…' : 'Select a customer'}</option>
          {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}{customer.email ? ` · ${customer.email}` : ''}</option>)}
        </select>
        {customersError && <div role="alert" className={styles.fieldError}>Customers couldn’t be loaded. <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry</button></div>}
        {!customersLoading && !customersError && customers.length === 0 && <span className={styles.hint}>No customers are available. Add a customer before creating a ticket.</span>}
        {errors.customerId && <span id={`${id('customerId')}-error`} className={styles.fieldError} role="alert">{errors.customerId}</span>}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={id('title')}>Title <span aria-hidden="true">*</span></label>
        <input id={id('title')} name="title" className={controlClass('title')} value={values.title} onChange={(event) => updateValue('title', event.target.value)} required disabled={pending} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? `${id('title')}-error` : undefined} />
        {errors.title && <span id={`${id('title')}-error`} className={styles.fieldError} role="alert">{errors.title}</span>}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={id('description')}>Description <span aria-hidden="true">*</span></label>
        <textarea id={id('description')} name="description" className={controlClass('description')} value={values.description} onChange={(event) => updateValue('description', event.target.value)} required rows={5} disabled={pending} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${id('description')}-error` : undefined} />
        {errors.description && <span id={`${id('description')}-error`} className={styles.fieldError} role="alert">{errors.description}</span>}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={id('severity')}>Severity <span aria-hidden="true">*</span></label>
        <select id={id('severity')} name="severity" className={controlClass('severity')} value={values.severity} onChange={(event) => updateValue('severity', event.target.value)} required disabled={pending} aria-invalid={Boolean(errors.severity)} aria-describedby={errors.severity ? `${id('severity')}-error` : undefined}>
          <option value="">Select severity</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        {errors.severity && <span id={`${id('severity')}-error`} className={styles.fieldError} role="alert">{errors.severity}</span>}
      </div>
      <p className={styles.hint}>New tickets start with New status and receive a sequential reference. Add files after creation.</p>
      <div className={styles.actions}>
        <button className={styles.submit} type="submit" disabled={pending || customersLoading || customersError || customers.length === 0}>{pending ? 'Creating ticket…' : 'Create ticket'}</button>
        <Link href="/admin/tickets" aria-disabled={pending} style={{ display: 'inline-flex', minHeight: 42, alignItems: 'center', padding: '0 14px', border: '1px solid var(--sd-border)', borderRadius: 'var(--sd-radius-control)', background: 'var(--sd-card)', color: 'var(--sd-foreground)', fontWeight: 600, textDecoration: 'none', pointerEvents: pending ? 'none' : 'auto' }}>Cancel</Link>
      </div>
    </form>
  )
}
