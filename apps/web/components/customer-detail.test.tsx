import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CustomerDetail from './customer-detail'
import { apiRequest } from '../lib/api-client'

jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))

const request = jest.mocked(apiRequest)
const customer = { id: 'customer-1', name: 'Avery Chen', email: 'avery@example.com', isActive: true }

beforeEach(() => {
  jest.clearAllMocks()
  request.mockResolvedValue(customer)
})

describe('admin customer detail', () => {
  it('[AC-7] allows editing customer name while keeping the created email read-only', async () => {
    render(<CustomerDetail customerId="customer-1" />)
    expect(await screen.findByRole('heading', { level: 2, name: 'Avery Chen' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit customer' }))

    const name = screen.getByLabelText(/^Full name/)
    const email = screen.getByLabelText('Email address')
    expect(name).toHaveValue('Avery Chen')
    expect(email).toHaveValue('avery@example.com')
    expect(email).toHaveAttribute('readonly')

    request.mockResolvedValueOnce({ ...customer, name: 'Avery C.' })
    fireEvent.change(name, { target: { value: 'Avery C.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(request).toHaveBeenCalledWith('/customers/customer-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Avery C.' }),
    }))
    expect(await screen.findByText('Avery C.', { selector: 'h2' })).toBeInTheDocument()
  })

  it('[AC-8] displays active state and confirms deactivation before using activation endpoint', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CustomerDetail customerId="customer-1" />)
    expect(await screen.findByText('This customer is active')).toBeInTheDocument()
    expect(screen.getAllByText('Active')).toHaveLength(2)
    expect(screen.getByText(/existing tickets; they remain intact/i)).toBeInTheDocument()

    request.mockResolvedValueOnce({ ...customer, isActive: false })
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate customer' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Existing tickets will remain intact'))
    await waitFor(() => expect(request).toHaveBeenCalledWith('/customers/customer-1/activation', {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    }))
    expect(await screen.findByText('This customer is inactive')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reactivate customer' })).toBeInTheDocument()
    confirm.mockRestore()
  })
})
