import { Suspense } from 'react'
import AdminTicketList from '../../../components/admin-ticket-list'

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={<main aria-busy="true">Loading tickets…</main>}>
      <AdminTicketList />
    </Suspense>
  )
}
