import { cookies } from 'next/headers'
import { ApiError, apiRequest } from '../../../lib/api-client'
import CustomerTicketDetail, { type CustomerTicket } from '../../../components/customer-ticket-detail'

export const dynamic = 'force-dynamic'

export default async function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params
  const cookieHeader = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join('; ')

  try {
    const ticket = await apiRequest<CustomerTicket>(`/tickets/${encodeURIComponent(ticketId)}`, {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    })
    return <CustomerTicketDetail ticket={ticket} />
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <CustomerTicketDetail ticket={null} />
    }
    return <CustomerTicketDetail ticket={null} loadError />
  }
}
