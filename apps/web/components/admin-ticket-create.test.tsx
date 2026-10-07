import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminTicketCreate from './admin-ticket-create'
import { apiRequest, ApiError } from '../lib/api-client'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('../lib/api-client', () => ({
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error {
    constructor(readonly status: number, message: string, readonly details?: unknown) {
      super(message)
    }
  },
}))

const apiRequestMock = jest.mocked(apiRequest)

it('[AC-12] creates a customer ticket with required details and opens its New-status detail', async () => {
  mockPush.mockClear()
  apiRequestMock.mockReset()
  apiRequestMock
    .mockResolvedValueOnce({ customers: [{ id: 'customer-7', name: 'Maya Chen', email: 'maya@example.com' }] })
    .mockRejectedValueOnce(new ApiError(400, 'Validation failed', {
      field: 'title',
      message: 'title should not be empty',
    }))
    .mockResolvedValueOnce({ id: 'ticket-10482', reference: 10482, status: 'NEW' })

  render(<AdminTicketCreate />)

  const customer = await screen.findByRole('option', { name: 'Maya Chen · maya@example.com' })
  expect(customer).toBeInTheDocument()

  fireEvent.submit(screen.getByRole('button', { name: 'Create ticket' }).closest('form')!)
  expect(await screen.findByText('Customer is required.')).toBeInTheDocument()
  expect(screen.getByText('Title is required.')).toBeInTheDocument()
  expect(apiRequestMock).toHaveBeenCalledTimes(1)

  fireEvent.change(screen.getByLabelText(/^Customer/), { target: { value: 'customer-7' } })
  fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'Cannot access account' } })
  fireEvent.change(screen.getByLabelText(/^Description/), { target: { value: 'Sign-in fails after a password reset.' } })
  fireEvent.change(screen.getByLabelText(/^Severity/), { target: { value: 'High' } })

  fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }))
  expect(await screen.findByText('title should not be empty')).toBeInTheDocument()
  expect(screen.getByLabelText(/^Title/)).toHaveValue('Cannot access account')

  fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Ticket SD-10482 created with New status.')
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/tickets/ticket-10482'))
  expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/tickets', {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'customer-7',
      title: 'Cannot access account',
      description: 'Sign-in fails after a password reset.',
      severity: 'High',
    }),
  })
})
