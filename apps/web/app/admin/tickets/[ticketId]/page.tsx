import AdminTicketDetail from '../../../../components/admin-ticket-detail'

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params
  return <AdminTicketDetail ticketId={ticketId} />
}
