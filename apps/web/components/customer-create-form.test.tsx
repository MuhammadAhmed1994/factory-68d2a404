import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CustomerCreateForm from './customer-create-form'
import { apiRequest } from '../lib/api-client'

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

it('[AC-5] creates a customer record and opens its details', async () => {
  apiRequestMock.mockResolvedValue({ id: 'customer-42' })
  render(<CustomerCreateForm />)

  fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Maya Chen' } })
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'maya.chen@example.com' } })
  expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Create customer' }))

  expect(await screen.findByRole('status')).toHaveTextContent('Customer created.')
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/customers/customer-42'))
  expect(apiRequestMock).toHaveBeenCalledWith('/customers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Maya Chen', email: 'maya.chen@example.com' }),
  })
})
