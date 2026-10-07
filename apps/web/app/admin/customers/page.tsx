import AppShell from '../../../components/app-shell'
import CustomerList from '../../../components/customer-list'

export default function AdminCustomersPage() {
  return (
    <AppShell role="admin" user={{ name: 'Administrator', email: '' }}>
      <CustomerList />
    </AppShell>
  )
}
