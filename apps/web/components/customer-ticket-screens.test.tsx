import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MyTickets from './my-tickets'
import CustomerTicketDetail from './customer-ticket-detail'
import { apiRequest } from '../lib/api-client'

jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))

const mockApiRequest = jest.mocked(apiRequest)

beforeEach(() => {
  jest.clearAllMocks()
  window.history.replaceState(null, '', '/tickets')
})

it('[AC-19] shows only API-authorized tickets and presents inaccessible detail without ticket data', async () => {
  mockApiRequest.mockResolvedValueOnce([
    { id: 'own-id', reference: 2841, title: 'My billing question', status: 'IN_PROGRESS', severity: 'MEDIUM', updatedAt: '2025-02-18T10:42:00.000Z' },
  ] as never)
  const list = render(<MyTickets />)

  expect(await screen.findByRole('link', { name: 'View ticket SD-2841: My billing question' })).toBeInTheDocument()
  expect(screen.queryByText('Another customer secret')).not.toBeInTheDocument()
  expect(mockApiRequest).toHaveBeenCalledWith('/tickets')

  list.unmount()
  render(<CustomerTicketDetail ticket={null} />)
  expect(screen.getByRole('heading', { name: 'Ticket not found.' })).toBeInTheDocument()
  expect(screen.getByText(/may not exist or may not be available to your account/i)).toBeInTheDocument()
  expect(screen.queryByText('Another customer secret')).not.toBeInTheDocument()
})

it('[AC-20] persists status filters in the URL and downloads accessible ticket attachments', async () => {
  mockApiRequest.mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never)
  const list = render(<MyTickets />)
  await screen.findByText("You don't have any tickets yet.")
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), { target: { value: 'RESOLVED' } })

  await waitFor(() => expect(window.location.search).toBe('?status=RESOLVED'))
  await waitFor(() => expect(mockApiRequest).toHaveBeenLastCalledWith('/tickets?status=RESOLVED'))
  list.unmount()

  const createObjectURL = jest.fn(() => 'blob:test-download')
  const revokeObjectURL = jest.fn()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['file']) })
  Object.defineProperty(global, 'fetch', { configurable: true, writable: true, value: fetchMock })
  render(<CustomerTicketDetail ticket={{
    id: 'ticket-1', reference: 31, title: 'Login issue', description: 'Cannot sign in', status: 'NEW', severity: 'HIGH',
    createdAt: '2025-02-17T10:00:00.000Z', updatedAt: '2025-02-18T10:00:00.000Z',
    attachments: [{ id: 'attachment-1', fileName: 'screen shot.png', sizeBytes: 2048, uploadedById: 'customer-1' }],
  }} />)
  expect(screen.getAllByText('screen shot.png')[0]).toBeInTheDocument()
  expect(screen.getByText(/2\.0 KB · Uploaded by customer-1/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Download screen shot\.png/ }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:3001/tickets/ticket-1/attachments/attachment-1',
    { credentials: 'include' },
  ))
  expect(createObjectURL).toHaveBeenCalled()
})
