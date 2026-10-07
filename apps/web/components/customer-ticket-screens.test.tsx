import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MyTickets from './my-tickets'
import CustomerTicketDetail from './customer-ticket-detail'
import { apiRequest, ApiError } from '../lib/api-client'

const mockReplace = jest.fn()
const mockSearchParams = { get: jest.fn(() => null), toString: jest.fn(() => '') }

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/tickets',
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock('../lib/api-client', () => ({
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error { constructor(readonly status: number, message: string) { super(message) } },
}))

const apiRequestMock = jest.mocked(apiRequest)
const sampleTicket = {
  id: 'ticket-17',
  reference: 'SD-17',
  title: 'Invoice access issue',
  description: 'Please help with my invoice.',
  status: 'New' as const,
  severity: 'Medium' as const,
  createdAt: '2025-02-18T10:42:00.000Z',
  updatedAt: '2025-02-18T10:42:00.000Z',
  attachments: [{ id: 'attachment-3', fileName: 'invoice.pdf', sizeBytes: 2048, uploader: 'Maya Chen' }],
}

describe('customer ticket screens', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams.get.mockReturnValue(null)
    apiRequestMock.mockImplementation(async (path: string) => {
      if (path === '/tickets') return [sampleTicket] as never
      if (path === '/tickets/ticket-17') return sampleTicket as never
      if (path === '/tickets/other-customer-ticket') throw new ApiError(404, 'Not found')
      return [] as never
    })
  })

  it('[AC-19] lists only the customer ticket and hides an inaccessible ticket as not found', async () => {
    const { unmount } = render(<MyTickets />)
    expect(await screen.findByRole('link', { name: 'View ticket SD-17: Invoice access issue' })).toBeInTheDocument()
    expect(apiRequestMock).toHaveBeenCalledWith('/tickets')
    unmount()

    render(<CustomerTicketDetail ticketId="other-customer-ticket" />)
    expect(await screen.findByRole('heading', { name: 'Ticket not found.' })).toBeInTheDocument()
    expect(screen.queryByText('Invoice access issue')).not.toBeInTheDocument()
  })

  it('[AC-20] persists status filters in the URL and downloads an accessible ticket attachment', async () => {
    render(<MyTickets />)
    await screen.findByRole('link', { name: 'View ticket SD-17: Invoice access issue' })
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'Resolved' } })
    expect(mockReplace).toHaveBeenCalledWith('/tickets?status=Resolved', { scroll: false })

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['contents']) })
    global.fetch = fetchMock as unknown as typeof fetch
    URL.createObjectURL = jest.fn(() => 'blob:attachment')
    URL.revokeObjectURL = jest.fn()
    const { unmount } = render(<CustomerTicketDetail ticketId="ticket-17" />)
    expect(await screen.findByRole('button', { name: 'Download invoice.pdf' })).toBeInTheDocument()
    expect(screen.getAllByText('invoice.pdf')).toHaveLength(2)
    expect(screen.getByText(/Uploaded by Maya Chen/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Download invoice.pdf' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/tickets/ticket-17/attachments/attachment-3',
      { credentials: 'include' },
    ))
    expect(screen.getByText('Please help with my invoice.')).toBeInTheDocument()
    unmount()
  })
})
