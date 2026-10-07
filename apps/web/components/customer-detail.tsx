'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import styles from './customer-detail.module.css'

export type CustomerRecord = {
  id: string
  name: string
  email: string
  isActive: boolean
}

type CustomerDetailProps = { customer: CustomerRecord }

export default function CustomerDetail({ customer: initialCustomer }: CustomerDetailProps) {
  const [customer, setCustomer] = useState(initialCustomer)
  const [name, setName] = useState(initialCustomer.name)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [changingActivation, setChangingActivation] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setFeedback('')
    setSaving(true)
    try {
      const updated = await apiRequest<CustomerRecord>(`/customers/${encodeURIComponent(customer.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      })
      setCustomer(updated)
      setName(updated.name)
      setEditing(false)
      setFeedback('Customer information saved.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save customer information. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActivation() {
    const nextActive = !customer.isActive
    if (!nextActive && !window.confirm('Deactivate this customer? Existing tickets will remain intact.')) return
    setError('')
    setFeedback('')
    setChangingActivation(true)
    try {
      const updated = await apiRequest<CustomerRecord>(`/customers/${encodeURIComponent(customer.id)}/activation`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      })
      setCustomer(updated)
      setFeedback(nextActive ? 'Customer reactivated.' : 'Customer deactivated. Existing tickets remain intact.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to change customer status. Please try again.')
    } finally {
      setChangingActivation(false)
    }
  }

  const state = customer.isActive ? 'Active' : 'Inactive'

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/admin/customers">Customers</Link><span aria-hidden="true">›</span><span aria-current="page">Customer record</span>
      </nav>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Customer management</p>
          <h1>Customer record</h1>
          <p className={styles.subtitle}>View and manage customer information.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={() => { setEditing((current) => !current); setError(''); setFeedback('') }}>
          {editing ? 'Cancel editing' : 'Edit customer'}
        </button>
      </header>

      {feedback && <p className={styles.feedback} role="status">{feedback}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      <article className={styles.card} aria-labelledby="customer-name">
        <header className={styles.cardHeader}>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">{customer.name.trim().slice(0, 2).toUpperCase()}</span>
            <div>
              <h2 id="customer-name">{customer.name}</h2>
              <p className={styles.identityEmail}>{customer.email}</p>
            </div>
          </div>
          <span className={`${styles.badge} ${customer.isActive ? styles.active : styles.inactive}`}>{state}</span>
        </header>

        <section className={styles.content} aria-labelledby="customer-info-heading">
          <div className={styles.sectionHeading}>
            <h2 id="customer-info-heading">Customer information</h2>
            <span>Profile details</span>
          </div>
          <form className={styles.form} onSubmit={saveCustomer}>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="customer-name-input">Full name</label>
                <input id="customer-name-input" name="name" value={name} onChange={(event) => setName(event.target.value)} readOnly={!editing} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="customer-email">Email address</label>
                <input id="customer-email" name="email" value={customer.email} readOnly aria-readonly="true" />
                <span className={styles.help}>Email is read-only after creation.</span>
              </div>
            </div>
            {editing && <button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>}
          </form>

          <hr className={styles.divider} />
          <div className={styles.sectionHeading}><h2>Account status</h2></div>
          <div className={styles.stateRow}>
            <div>
              <h3>{`This customer is ${customer.isActive ? 'active' : 'inactive'}`}</h3>
              <p>{customer.isActive ? 'An active customer can continue to receive support.' : 'This customer cannot sign in while inactive.'} Deactivation does not delete existing tickets.</p>
            </div>
            <span className={`${styles.badge} ${customer.isActive ? styles.active : styles.inactive}`}>{state}</span>
          </div>
        </section>
        <footer className={styles.footer}>
          <p>Deactivation preserves this customer’s existing tickets.</p>
          <div className={styles.footerActions}>
            <Link className={styles.backLink} href="/admin/customers">Back to customers</Link>
            <button className={customer.isActive ? styles.dangerButton : styles.secondaryButton} type="button" onClick={toggleActivation} disabled={changingActivation}>
              {changingActivation ? 'Updating…' : customer.isActive ? 'Deactivate customer' : 'Reactivate customer'}
            </button>
          </div>
        </footer>
      </article>
    </main>
  )
}
