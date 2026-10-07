import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import TicketManagementPanel, { type ManagedTicket } from './ticket-management-panel'

const ticket: ManagedTicket = {
  id: 'ticket-123', reference: 2847, title: 'Cannot export invoices', description: 'Export fails each time.',
  severity: 'HIGH', status: 'IN_PROGRESS', updatedAt: '2025-06-19T10:42:00.000Z',
}

function mockApiResponse(payload: unknown = {}) {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(payload) }) as jest.Mock
}

beforeEach(() => { jest.restoreAllMocks() })

test('[AC-15] edits ticket details and preserves fields while saving', async () => {
  mockApiResponse({ id: ticket.id, title: 'Export is failing', description: 'Still cannot export.', severity: 'MEDIUM', updatedById: 'admin-1', updatedAt: '2025-06-20T12:00:00Z' })
  render(<TicketManagementPanel ticket={ticket} />)

  fireEvent.click(screen.getByRole('button', { name: 'Edit ticket' }))
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Export is failing' } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Still cannot export.' } })
  fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'Medium' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

  await screen.findByRole('status')
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/tickets/ticket-123'), expect.objectContaining({
    method: 'PATCH',
    body: JSON.stringify({ title: 'Export is failing', description: 'Still cannot export.', severity: 'MEDIUM' }),
  }))
  expect(screen.getByText('Export is failing')).toBeInTheDocument()
})

test('[AC-16] changes status through the distinct status endpoint', async () => {
  mockApiResponse({ id: ticket.id, status: 'RESOLVED' })
  render(<TicketManagementPanel ticket={ticket} />)

  fireEvent.click(screen.getByRole('button', { name: 'Move to Resolved' }))
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/tickets/ticket-123/status'), expect.objectContaining({
    method: 'PATCH', body: JSON.stringify({ status: 'RESOLVED' }),
  }))
  expect(await screen.findByText('Resolved')).toBeInTheDocument()
})

test('[AC-17] offers only allowed next transitions and none for Closed', () => {
  const { rerender } = render(<TicketManagementPanel key="new" ticket={{ ...ticket, status: 'NEW' }} />)
  expect(screen.getByRole('button', { name: 'Move to In Progress' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Move to Resolved' })).not.toBeInTheDocument()

  rerender(<TicketManagementPanel key="in-progress" ticket={{ ...ticket, status: 'IN_PROGRESS' }} />)
  expect(screen.getByRole('button', { name: 'Move to Resolved' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Move to Closed' })).not.toBeInTheDocument()

  rerender(<TicketManagementPanel key="resolved" ticket={{ ...ticket, status: 'RESOLVED' }} />)
  expect(screen.getByRole('button', { name: 'Move to In Progress' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Move to Closed' })).toBeInTheDocument()

  rerender(<TicketManagementPanel key="closed" ticket={{ ...ticket, status: 'CLOSED' }} />)
  expect(screen.getByText('Closed tickets have no available status transitions.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Move to/ })).not.toBeInTheDocument()
})

test('[AC-18] requires explicit confirmation and explains attachment removal before permanent deletion', async () => {
  mockApiResponse({ deleted: true })
  render(<TicketManagementPanel ticket={ticket} />)

  fireEvent.click(screen.getByRole('button', { name: 'Delete ticket' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByText(/permanently deletes the ticket and removes all of its attachments/i)).toBeInTheDocument()
  expect(global.fetch).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'Confirm permanent deletion' }))
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/tickets/ticket-123'), expect.objectContaining({ method: 'DELETE' })))
})
