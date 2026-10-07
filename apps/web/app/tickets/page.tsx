import { Suspense } from 'react'
import MyTickets from '../../components/my-tickets'

export default function TicketsPage() {
  return (
    <Suspense fallback={<main><p role="status">Loading your tickets…</p></main>}>
      <MyTickets />
    </Suspense>
  )
}
