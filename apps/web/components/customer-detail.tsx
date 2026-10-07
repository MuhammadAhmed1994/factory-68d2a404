'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../lib/api-client'
import RecordForm, { type RecordFormValues } from './record-form'
import StatusBadge from './status-badge'

type Customer = {
  id: string
  name: string
  email: string
  isActive: boolean
}

type LoadState = 'loading' | 'loaded' | 'not-found' | 'error'

export default function CustomerDetail({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [editing, setEditing] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [activationPending, setActivationPending] = useState(false)

  const loadCustomer = useCallback(async () => {
    setLoadState('loading')
    setCustomer(null)
    setRequestError('')
    try {
      const record = await apiRequest<Customer>(`/customers/${encodeURIComponent(customerId)}`)
      setCustomer(record)
      setLoadState('loaded')
    } catch (error) {
      setCustomer(null)
      setLoadState(error && typeof error === 'object' && 'status' in error && error.status === 404 ? 'not-found' : 'error')
    }
  }, [customerId])

  useEffect(() => {
    void loadCustomer()
  }, [loadCustomer])

  async function saveDetails(values: RecordFormValues) {
    setRequestError('')
    const updated = await apiRequest<Customer>(`/customers/${encodeURIComponent(customerId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: values.name }),
    })
    setCustomer(updated)
    setEditing(false)
  }

  async function changeActivation() {
    if (!customer || activationPending) return
    const nextActive = !customer.isActive
    if (!nextActive && !window.confirm('Deactivate this customer? Existing tickets will remain intact and visible to admins.')) return

    setActivationPending(true)
    setRequestError('')
    try {
      const updated = await apiRequest<Customer>(`/customers/${encodeURIComponent(customerId)}/activation`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      })
      setCustomer(updated)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to update account status. Please try again.')
    } finally {
      setActivationPending(false)
    }
  }

  if (loadState === 'loading') return <main><p role="status">Loading customer…</p></main>
  if (loadState === 'not-found') return <main><h1>Customer record not found.</h1><Link href="/admin/customers">Back to customers</Link></main>
  if (loadState === 'error') return <main><h1>Customer couldn&apos;t be loaded. Try again.</h1><p role="alert">Customer details are unavailable.</p><button type="button" onClick={() => void loadCustomer()}>Try again</button><p><Link href="/admin/customers">Back to customers</Link></p></main>
  if (!customer) return null

  return (
    <main style={{ width: 'min(100% - 40px, 1010px)', margin: '0 auto', padding: '32px 0 56px' }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}><Link href="/admin/customers">Customers</Link> / <span aria-current="page">Customer record</span></nav>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <p style={{ margin: '0 0 4px', color: 'var(--sd-muted-foreground)' }}>Customer management</p>
          <h1 style={{ margin: 0 }}>Customer record</h1>
          <p style={{ margin: '6px 0 0' }}>View and manage customer information.</p>
        </div>
        {!editing && <button type="button" onClick={() => setEditing(true)}>Edit customer</button>}
      </header>

      {requestError && <p role="alert">{requestError}</p>}
      <article aria-labelledby="customer-name" style={{ padding: 24, border: '1px solid var(--sd-border)', borderRadius: 'var(--sd-radius-panel)', background: 'var(--sd-card)' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingBottom: 20, borderBottom: '1px solid var(--sd-border)' }}>
          <div>
            <h2 id="customer-name" style={{ margin: 0 }}>{customer.name}</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--sd-muted-foreground)' }}>{customer.email}</p>
          </div>
          <StatusBadge status={customer.isActive ? 'Active' : 'Inactive'} />
        </header>

        <section style={{ padding: '22px 0' }}>
          <h2 style={{ fontSize: 18 }}>Customer information</h2>
          {editing ? (
            <RecordForm
              mode="edit"
              initialValues={{ name: customer.name, email: customer.email }}
              fields={[
                { name: 'name', label: 'Full name', type: 'text', required: true },
                { name: 'email', label: 'Email address', type: 'email', readOnly: true, hint: 'Email is read-only after creation.' },
              ]}
              onSubmit={saveDetails}
              successMessage="Customer details saved."
            />
          ) : (
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              <div><dt>Full name</dt><dd>{customer.name}</dd></div>
              <div><dt>Email address</dt><dd>{customer.email}</dd><p style={{ margin: '4px 0', color: 'var(--sd-muted-foreground)' }}>Email is read-only after creation.</p></div>
            </dl>
          )}
          {editing && <button type="button" onClick={() => setEditing(false)} style={{ marginTop: 12 }}>Cancel</button>}
        </section>

        <section style={{ padding: '18px 0', borderTop: '1px solid var(--sd-border)' }}>
          <h2 style={{ fontSize: 18 }}>Account status</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 16, background: 'var(--sd-muted)', borderRadius: 8 }}>
            <div><strong>This customer is {customer.isActive ? 'active' : 'inactive'}</strong><p style={{ margin: '4px 0 0' }}>An active customer can continue to receive support. Deactivation does not delete existing tickets; they remain intact and visible to admins.</p></div>
            <StatusBadge status={customer.isActive ? 'Active' : 'Inactive'} />
          </div>
        </section>

        <footer style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingTop: 18, borderTop: '1px solid var(--sd-border)' }}>
          <Link href="/admin/customers">Back to customers</Link>
          <button type="button" disabled={activationPending} onClick={() => void changeActivation()}>
            {activationPending ? 'Updating…' : customer.isActive ? 'Deactivate customer' : 'Reactivate customer'}
          </button>
        </footer>
      </article>
    </main>
  )
}
