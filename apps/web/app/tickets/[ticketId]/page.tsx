import CustomerTicketDetail from '../../../components/customer-ticket-detail'

export default async function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params
  return <CustomerTicketDetail ticketId={ticketId} />
}
