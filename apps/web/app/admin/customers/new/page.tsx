import type { Metadata } from 'next'
import Link from 'next/link'
import AppShell from '../../../../components/app-shell'
import CustomerCreateForm from '../../../../components/customer-create-form'

export const metadata: Metadata = {
  title: 'Add customer',
}

export default function NewCustomerPage() {
  return (
    <AppShell role="admin" user={{ name: 'Administrator', email: '' }}>
      <div style={{ width: 'min(100%, 760px)', margin: '0 auto', padding: '32px 24px 56px' }}>
        <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 24, color: 'var(--sd-muted-foreground)' }}>
          <Link href="/admin/customers">Customers</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Add customer</span>
        </nav>
        <header style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 6px', color: 'var(--sd-primary)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Customer management</p>
          <h1 style={{ margin: 0, fontSize: 24, lineHeight: '32px', fontWeight: 600 }}>Add customer</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--sd-muted-foreground)' }}>Enter the customer’s contact details.</p>
        </header>
        <section aria-labelledby="customer-details-heading" style={{ padding: 24, border: '1px solid var(--sd-border)', borderRadius: 'var(--sd-radius-panel)', background: 'var(--sd-card)', boxShadow: 'var(--sd-shadow-panel)' }}>
          <h2 id="customer-details-heading" style={{ margin: '0 0 4px', fontSize: 18, lineHeight: '26px', fontWeight: 600 }}>Customer details</h2>
          <p style={{ margin: '0 0 24px', color: 'var(--sd-muted-foreground)' }}>Customer email can’t be changed after creation.</p>
          <CustomerCreateForm />
        </section>
      </div>
    </AppShell>
  )
}
