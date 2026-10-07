import { act, fireEvent, render, screen } from '@testing-library/react'
import AdminTicketCreate from './admin-ticket-create'
import { ApiError, apiRequest } from '../lib/api-client'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('../lib/api-client', () => ({
  ApiError: jest.requireActual('../lib/api-client').ApiError,
  apiRequest: jest.fn(),
}))

const mockedApiRequest = jest.mocked(apiRequest)

beforeEach(() => {
  jest.clearAllMocks()
  mockedApiRequest.mockResolvedValueOnce({
    customers: [{ id: 'customer-1', name: 'Melanie Carter', email: 'melanie@example.com' }],
  })
})

afterEach(() => {
  jest.useRealTimers()
})

test('[AC-12] admin selects a customer, resolves server validation, and creates a New ticket with a sequential reference', async () => {
  mockedApiRequest
    .mockRejectedValueOnce(new ApiError(400, 'Ticket submission validation failed', {
      message: 'Ticket submission validation failed',
      fields: { title: ['title should not be empty'] },
    }))
    .mockResolvedValueOnce({ id: 'ticket-42', reference: 42, status: 'NEW' })

  render(<AdminTicketCreate />)

  const customer = await screen.findByRole('combobox', { name: /customer/i })
  expect(screen.getByRole('option', { name: /Melanie Carter/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }))
  expect(await screen.findByText('Customer is required.')).toBeInTheDocument()
  expect(screen.getByText('Title is required.')).toBeInTheDocument()
  expect(screen.getByText('Description is required.')).toBeInTheDocument()
  expect(screen.getByText('Severity is required.')).toBeInTheDocument()
  expect(mockedApiRequest).toHaveBeenCalledTimes(1)

  fireEvent.change(customer, { target: { value: 'customer-1' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Account access issue' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), { target: { value: 'Unable to sign in.' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Severity' }), { target: { value: 'High' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }))

  expect(await screen.findByText('title should not be empty')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Account access issue')
  expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('Unable to sign in.')
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Account access issue' } })
  jest.useFakeTimers()
  fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }))

  expect(await screen.findByText('Ticket SD-42 created successfully with New status.')).toBeInTheDocument()
  expect(mockedApiRequest).toHaveBeenLastCalledWith('/tickets', {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'customer-1',
      title: 'Account access issue',
      description: 'Unable to sign in.',
      severity: 'High',
    }),
  })
  await act(async () => { jest.advanceTimersByTime(700) })
  expect(mockPush).toHaveBeenCalledWith('/admin/tickets/ticket-42')
})
