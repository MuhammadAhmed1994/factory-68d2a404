'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import RecordForm, { type RecordFormErrors, type RecordFormValues } from './record-form'
import { ApiError, apiRequest } from '../lib/api-client'

type Customer = { id: string; name: string; email?: string }
type CustomerList = { customers: Customer[] }
type CreatedTicket = { id: string; reference: string | number; status: string }

function getServerErrors(error: unknown): RecordFormErrors {
  const details = error instanceof ApiError ? error.details : undefined
  if (details && typeof details === 'object') {
    const body = details as { fields?: unknown; errors?: unknown; message?: unknown }
    const fields = body.fields ?? body.errors
    if (fields && typeof fields === 'object') {
      return Object.fromEntries(Object.entries(fields).map(([field, message]) => [
        field,
        Array.isArray(message) ? message.filter((item): item is string => typeof item === 'string').join(' ') : String(message),
      ]))
    }
    if (typeof body.message === 'string') return { form: body.message }
    if (Array.isArray(body.message)) return { form: body.message.join(' ') }
  }
  return { form: error instanceof Error ? error.message : "Ticket couldn't be created. Review the highlighted fields and try again." }
}

export default function AdminTicketCreate() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [announcement, setAnnouncement] = useState('')

  const loadCustomers = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setLoadError(false)
    try {
      const result = await apiRequest<CustomerList>('/customers', { signal })
      if (!signal.aborted) setCustomers(Array.isArray(result.customers) ? result.customers : [])
    } catch {
      if (!signal.aborted) setLoadError(true)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadCustomers(controller.signal)
    return () => controller.abort()
  }, [loadCustomers, retry])

  async function createTicket(values: RecordFormValues): Promise<void | RecordFormErrors> {
    setAnnouncement('')
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
      const reference = `SD-${ticket.reference}`
      setAnnouncement(`Ticket ${reference} created successfully with New status.`)
      window.setTimeout(() => router.push(`/admin/tickets/${encodeURIComponent(ticket.id)}`), 700)
    } catch (error) {
      return getServerErrors(error)
    }
  }

  return (
    <main style={{ width: 'min(100% - 40px, 680px)', margin: '0 auto', padding: '32px 0 64px' }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 24, color: 'var(--sd-muted-foreground)', fontSize: 12 }}>
        <Link href="/admin/tickets">Tickets</Link><span aria-hidden="true"> / </span><span aria-current="page">Create ticket</span>
      </nav>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, lineHeight: '32px', fontWeight: 600 }}>Create ticket</h1>
        <p style={{ margin: '5px 0 0', color: 'var(--sd-muted-foreground)' }}>Create a support request for a customer.</p>
      </header>

      {announcement && <p role="status" aria-live="polite">{announcement}</p>}
      <section aria-label="Ticket details" style={{ padding: 24, border: '1px solid var(--sd-border)', borderRadius: 8, background: 'var(--sd-card)', boxShadow: 'var(--sd-shadow-panel)' }}>
        {loading ? (
          <p role="status" aria-live="polite">Loading customers…</p>
        ) : loadError ? (
          <div role="alert">
            <p>Customers couldn’t be loaded. Try again.</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button>
          </div>
        ) : customers.length === 0 ? (
          <div role="status">No customers are available. Add a customer before creating a ticket.</div>
        ) : (
          <>
            <RecordForm
              fields={[
                {
                  name: 'customerId',
                  label: 'Customer',
                  type: 'select',
                  required: true,
                  options: customers.map((customer) => ({ value: customer.id, label: customer.email ? `${customer.name} · ${customer.email}` : customer.name })),
                },
                { name: 'title', label: 'Title', type: 'text', required: true },
                { name: 'description', label: 'Description', type: 'textarea', required: true },
                {
                  name: 'severity',
                  label: 'Severity',
                  type: 'select',
                  required: true,
                  options: [
                    { value: 'Low', label: 'Low' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'High', label: 'High' },
                  ],
                },
              ]}
              submitLabel="Create ticket"
              submittingLabel="Creating ticket…"
              successMessage="Ticket submitted. Opening ticket details…"
              onSubmit={createTicket}
            />
            <p style={{ margin: '12px 0 0', color: 'var(--sd-muted-foreground)', fontSize: 12 }}>
              New tickets start with New status and receive a sequential reference. Add files after creation.
            </p>
          </>
        )}
        <p style={{ margin: '16px 0 0' }}><Link href="/admin/tickets">Cancel</Link></p>
      </section>
    </main>
  )
}
