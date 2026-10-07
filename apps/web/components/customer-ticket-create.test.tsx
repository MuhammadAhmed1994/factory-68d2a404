import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CustomerTicketCreate from './customer-ticket-create'
import { apiRequest } from '../lib/api-client'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))

const mockApiRequest = jest.mocked(apiRequest)

beforeEach(() => {
  jest.clearAllMocks()
})

it('[AC-11] shows selected attachment name, size, and uploader and submits it with the ticket', async () => {
  mockApiRequest.mockResolvedValueOnce({ id: 'ticket-42', reference: 42, status: 'NEW', attachments: [{ id: 'a1', fileName: 'details.txt', sizeBytes: 6, uploadedById: 'customer-1' }] } as never)
  render(<CustomerTicketCreate />)

  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Cannot access account' } })
  fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'The sign-in page returns an error.' } })
  fireEvent.change(screen.getByLabelText(/Severity/), { target: { value: 'Medium' } })
  const file = new File(['hello!'], 'details.txt', { type: 'text/plain' })
  fireEvent.change(screen.getByLabelText('Choose attachments'), { target: { files: [file] } })

  expect(screen.getByText('details.txt')).toBeInTheDocument()
  expect(screen.getByText(/6 bytes · Uploaded by You · Selected/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Submit ticket' }))

  await waitFor(() => expect(mockApiRequest).toHaveBeenCalledWith('/tickets', expect.objectContaining({ method: 'POST', body: expect.any(FormData) })))
  const body = mockApiRequest.mock.calls[0][1]?.body as FormData
  expect(body.get('title')).toBe('Cannot access account')
  expect(body.get('description')).toBe('The sign-in page returns an error.')
  expect(body.get('severity')).toBe('Medium')
  const submittedFile = body.get('attachments') as File
  expect(submittedFile.name).toBe('details.txt')
  expect(submittedFile.size).toBe(6)
  expect(mockPush).toHaveBeenCalledWith('/tickets/ticket-42')
})
