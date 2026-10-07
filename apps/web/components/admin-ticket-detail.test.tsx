import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminTicketDetail, { type AdminTicket } from './admin-ticket-detail'
import { apiRequest } from '../lib/api-client'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, refresh: jest.fn() }) }))
jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))

const mockedApiRequest = jest.mocked(apiRequest)
const originalFetch = globalThis.fetch

const ticket: AdminTicket = {
  id: 'ticket-42',
  reference: 42,
  title: 'Unable to export monthly invoices',
  description: 'Exports fail before the download starts.',
  severity: 'HIGH',
  status: 'NEW',
  createdAt: '2025-06-18T10:00:00.000Z',
  updatedAt: '2025-06-18T10:00:00.000Z',
  createdById: 'customer-1',
  customer: { id: 'customer-1', name: 'Jamie Lee', email: 'jamie@example.com' },
  attachments: [{ id: 'attachment-old', fileName: 'export-error.png', sizeBytes: 2048, uploadedById: 'customer-1' }],
}

beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  jest.restoreAllMocks()
  if (originalFetch) Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: originalFetch })
  else Reflect.deleteProperty(globalThis, 'fetch')
})

it('[AC-13] admin uploads a file after creation and sees attachment name, size, and uploader', async () => {
  mockedApiRequest.mockResolvedValueOnce({
    id: 'attachment-new',
    fileName: 'diagnostic.txt',
    sizeBytes: 512,
    uploadedById: 'admin-1',
  })
  render(<AdminTicketDetail ticket={ticket} />)

  expect(screen.getAllByText('export-error.png')).toHaveLength(2)
  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('2.0 KB · Uploaded by Jamie Lee')
  const file = new File(['diagnostic data'], 'diagnostic.txt', { type: 'text/plain' })
  fireEvent.change(screen.getByLabelText('Choose files'), { target: { files: [file] } })
  expect(await screen.findByText('diagnostic.txt')).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('15 bytes · Administrator · Not uploaded')
  fireEvent.click(screen.getByRole('button', { name: 'Upload files' }))
  await waitFor(() => expect(mockedApiRequest).toHaveBeenCalledWith('/tickets/ticket-42/attachments', expect.objectContaining({
    method: 'POST',
    body: expect.any(FormData),
  })))
})

it('[AC-23] admin sees accessible ticket details and downloads its attachment through the authorized endpoint', async () => {
  const createObjectURL = jest.fn(() => 'blob:attachment')
  const revokeObjectURL = jest.fn()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['private attachment']) })
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetchMock })

  render(<AdminTicketDetail ticket={ticket} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Ticket detail' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 2, name: ticket.title })).toBeInTheDocument()
  expect(screen.getByText('Customer: Jamie Lee')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Download export-error.png/ }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:3001/tickets/ticket-42/attachments/attachment-old',
    { credentials: 'include' },
  ))
  expect(createObjectURL).toHaveBeenCalled()
})
