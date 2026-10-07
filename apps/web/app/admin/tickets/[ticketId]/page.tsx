import { Suspense } from 'react'
import { cookies } from 'next/headers'
import AdminTicketDetail, { type AdminTicket } from '../../../../components/admin-ticket-detail'
import { ApiError, apiRequest } from '../../../../lib/api-client'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ ticketId: string }> }

async function TicketDetails({ params }: PageProps) {
  const { ticketId } = await params
  const cookieHeader = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join('; ')

  try {
    const ticket = await apiRequest<AdminTicket>(`/tickets/${encodeURIComponent(ticketId)}`, {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    })
    if (!ticket || !Array.isArray(ticket.attachments)) throw new Error('Invalid ticket response')
    return <AdminTicketDetail ticket={ticket} />
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <AdminTicketDetail ticket={null} state="not-found" />
    }
    return <AdminTicketDetail ticket={null} state="error" />
  }
}

export default function AdminTicketDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<AdminTicketDetail ticket={null} state="loading" />}>
      <TicketDetails {...props} />
    </Suspense>
  )
}
