import type { Metadata } from 'next'
import AppShell from '../../../components/app-shell'
import CustomerList from '../../../components/customer-list'

export const metadata: Metadata = {
  title: 'Customers',
}

/** The shared role-aware shell wraps the interactive customer list. */
export default function AdminCustomersPage() {
  return (
    <AppShell role="admin" user={{ name: 'Administrator', email: '' }}>
      <CustomerList />
    </AppShell>
  )
}
