import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import CustomerCreateForm from './customer-create-form'
import { apiRequest } from '../lib/api-client'

jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

const mockApiRequest = jest.mocked(apiRequest)
const mockPush = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
})

test('[AC-5] creates a customer record and opens its detail page', async () => {
  mockApiRequest.mockResolvedValueOnce({ id: 'customer-123' })
  render(<CustomerCreateForm />)

  fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Maya Chen' } })
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'maya.chen@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create customer' }))

  expect(await screen.findByRole('button', { name: 'Creating customer…' })).toBeDisabled()
  expect(mockApiRequest).toHaveBeenCalledWith('/customers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Maya Chen', email: 'maya.chen@example.com' }),
  })
  expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
  expect(await screen.findByRole('status')).toHaveTextContent('Customer created.')
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/customers/customer-123'))
})
