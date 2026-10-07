import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import TicketManagementPanel, { type ManagedTicket } from './ticket-management-panel'
import TransitionControl from './transition-control'

const ticket: ManagedTicket = {
  id: 'ticket-42',
  reference: 2847,
  title: 'Export is failing',
  description: 'Invoice export fails before download.',
  severity: 'Medium',
  status: 'New',
}

function mockApiResponse(status = 200, payload: unknown = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  } as Response)
}

beforeEach(() => { global.fetch = jest.fn() })

test('[AC-15] edits ticket title, description, and severity through the ticket update request and preserves form values after an error', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: false, status: 422, text: async () => JSON.stringify({ message: 'Title is invalid' }) } as Response)
    .mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ title: 'Export fixed', description: 'Updated details', severity: 'HIGH', updatedBy: 'Admin' }) } as Response)
  render(<TicketManagementPanel ticket={ticket} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit ticket' }))
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Export fixed' } })
  fireEvent.change(screen.getByLabelText('Description', { selector: 'textarea' }), { target: { value: 'Updated details' } })
  fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'High' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Title is invalid')
  expect(screen.getByLabelText('Title')).toHaveValue('Export fixed')
  expect(screen.getByLabelText('Description', { selector: 'textarea' })).toHaveValue('Updated details')
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Ticket details saved'))
  expect(global.fetch).toHaveBeenLastCalledWith('http://localhost:3001/tickets/ticket-42', expect.objectContaining({
    method: 'PATCH',
    body: JSON.stringify({ title: 'Export fixed', description: 'Updated details', severity: 'HIGH' }),
    credentials: 'include',
  }))
  expect(screen.getByText('High')).toBeInTheDocument()
})

test('[AC-16] changes status through the distinct status endpoint', async () => {
  mockApiResponse()
  render(<TransitionControl ticketId="ticket-42" status="New" />)
  fireEvent.click(screen.getByRole('button', { name: 'Change to In Progress' }))
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tickets/ticket-42/status', expect.objectContaining({
    method: 'PATCH',
    body: JSON.stringify({ status: 'IN_PROGRESS' }),
  }))
})

test('[AC-17] offers only allowed next transitions and no transition for Closed', () => {
  const { rerender } = render(<TransitionControl ticketId="t" status="New" />)
  expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['In Progress'])
  rerender(<TransitionControl ticketId="t" status="In Progress" />)
  expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Resolved'])
  rerender(<TransitionControl ticketId="t" status="Resolved" />)
  expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['In Progress', 'Close ticket'])
  rerender(<TransitionControl ticketId="t" status="Closed" />)
  expect(screen.queryAllByRole('button')).toHaveLength(0)
  expect(screen.getByText('No status changes are available.')).toBeInTheDocument()
})

test('[AC-18] requires explicit confirmation before permanently deleting a ticket and its attachments', async () => {
  mockApiResponse(204, undefined)
  render(<TicketManagementPanel ticket={ticket} />)
  fireEvent.click(screen.getByRole('button', { name: 'Delete ticket' }))
  const dialog = screen.getByRole('alertdialog')
  expect(within(dialog).getByText(/permanently deletes the ticket and removes all of its attachments/i)).toBeInTheDocument()
  expect(global.fetch).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Permanently delete ticket' }))
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tickets/ticket-42', expect.objectContaining({ method: 'DELETE' })))
})
