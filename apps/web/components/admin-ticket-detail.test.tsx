import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminTicketDetail from './admin-ticket-detail'
import { ApiError, apiRequest } from '../lib/api-client'

jest.mock('../lib/api-client', () => ({
  ApiError: class ApiError extends Error { constructor(readonly status: number, message: string) { super(message) } },
  apiRequest: jest.fn(),
}))

const apiMock = jest.mocked(apiRequest)
const ticket = {
  id: 'ticket-25',
  reference: 25,
  title: 'Export is failing',
  description: 'The monthly export fails when downloaded.',
  severity: 'HIGH',
  status: 'NEW',
  createdAt: '2026-06-15T10:00:00.000Z',
  updatedAt: '2026-06-16T10:00:00.000Z',
  customer: { id: 'customer-1', name: 'Alex Rivera', email: 'alex@example.test' },
  attachments: [{ id: 'attachment-1', fileName: 'export-log.txt', sizeBytes: 2048, uploadedByName: 'Alex Rivera' }],
}

beforeEach(() => {
  jest.clearAllMocks()
  apiMock.mockResolvedValue(ticket as never)
  global.fetch = jest.fn()
})

it('[AC-13] lists attachment name, size, and uploader and uploads additional files after ticket creation', async () => {
  render(<AdminTicketDetail ticketId="ticket-25" />)
  const attachmentRows = await screen.findByRole('list', { name: 'Attachments' })
  expect(attachmentRows).toHaveTextContent('export-log.txt')
  expect(attachmentRows).toHaveTextContent('2.0 KB')
  expect(attachmentRows).toHaveTextContent('Uploaded by Alex Rivera')

  const input = screen.getByLabelText('Choose files')
  const file = new File(['new report'], 'new-report.csv', { type: 'text/csv' })
  fireEvent.change(input, { target: { files: [file] } })
  fireEvent.click(screen.getByRole('button', { name: 'Upload files' }))

  await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/tickets/ticket-25/attachments', expect.objectContaining({ method: 'POST', body: expect.any(FormData) })))
  expect((apiMock.mock.calls.find(([path]) => path === '/tickets/ticket-25/attachments')?.[1]?.body as FormData).get('file')).toBe(file)
})

it('[AC-23] shows accessible ticket details, downloads through its authorized attachment endpoint, and hides inaccessible ticket data', async () => {
  const view = render(<AdminTicketDetail ticketId="ticket-25" />)
  expect(await screen.findByRole('heading', { name: 'Export is failing' })).toBeInTheDocument()

  URL.createObjectURL = jest.fn(() => 'blob:attachment')
  URL.revokeObjectURL = jest.fn()
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, blob: async () => new Blob(['file']) })
  fireEvent.click(screen.getByRole('button', { name: /Download export-log.txt/ }))
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tickets/ticket-25/attachments/attachment-1', { credentials: 'include' }))

  view.unmount()
  apiMock.mockRejectedValueOnce(new ApiError(404, 'Ticket not found'))
  render(<AdminTicketDetail ticketId="inaccessible" />)
  expect(await screen.findByRole('heading', { name: 'Ticket not found.' })).toBeInTheDocument()
  expect(screen.queryByText('Export is failing')).not.toBeInTheDocument()
})
