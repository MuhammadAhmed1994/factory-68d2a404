import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CustomerTicketCreate from './customer-ticket-create'
import { apiRequest } from '../lib/api-client'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('../lib/api-client', () => ({
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error {
    constructor(readonly status: number, message: string, readonly details?: unknown) { super(message) }
  },
}))

const apiRequestMock = jest.mocked(apiRequest)

describe('customer ticket creation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    apiRequestMock.mockResolvedValue({ id: 'ticket-42', reference: 'SD-42' } as never)
  })

  it('[AC-11] submits selected attachments and displays each file name, size, and uploader', async () => {
    render(<CustomerTicketCreate />)
    const file = new File(['abc'], 'details.txt', { type: 'text/plain' })
    const filePicker = screen.getByLabelText('Choose files')
    fireEvent.change(filePicker, { target: { files: [file] } })

    expect(screen.getByText('details.txt')).toBeInTheDocument()
    const fileRow = screen.getByRole('listitem')
    expect(fileRow.textContent).toContain('3 bytes')
    expect(fileRow.textContent).toContain('You')
    fireEvent.click(screen.getByRole('button', { name: 'Remove details.txt' }))
    expect(screen.queryByText('details.txt')).not.toBeInTheDocument()
    fireEvent.change(filePicker, { target: { files: [file] } })

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'Cannot access account' } })
    fireEvent.change(screen.getByLabelText(/^Description/), { target: { value: 'Please investigate this account issue.' } })
    fireEvent.change(screen.getByLabelText(/^Severity/), { target: { value: 'High' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit ticket' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/tickets/ticket-42'))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(apiRequestMock).toHaveBeenCalledTimes(1)
    const [path, options] = apiRequestMock.mock.calls[0] as [string, { method: string; body: FormData }]
    expect(path).toBe('/tickets')
    expect(options.method).toBe('POST')
    expect(options.body.get('title')).toBe('Cannot access account')
    expect(options.body.get('description')).toBe('Please investigate this account issue.')
    expect(options.body.get('severity')).toBe('High')
    expect((options.body.get('files') as File).name).toBe('details.txt')
  })
})
