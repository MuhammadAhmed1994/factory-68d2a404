import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CustomerDetail, { type CustomerRecord } from './customer-detail'

const customer: CustomerRecord = {
  id: 'customer-42',
  name: 'Avery Chen',
  email: 'avery@example.com',
  isActive: true,
}

function successfulResponse(body: CustomerRecord) {
  return { ok: true, status: 200, text: async () => JSON.stringify(body) } as Response
}

function mockFetch(body: CustomerRecord) {
  const fetchMock = jest.fn().mockResolvedValue(successfulResponse(body))
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetchMock })
  return fetchMock
}

describe('Customer detail', () => {
  it('[AC-7] edits customer name while keeping the created email read-only', async () => {
    const updated = { ...customer, name: 'Avery Chen-Smith' }
    const fetchMock = mockFetch(updated)
    render(<CustomerDetail customer={customer} />)

    const email = screen.getByRole('textbox', { name: 'Email address' })
    expect(email).toHaveAttribute('readonly')
    expect(email).toHaveValue('avery@example.com')

    fireEvent.click(screen.getByRole('button', { name: 'Edit customer' }))
    const name = screen.getByRole('textbox', { name: 'Full name' })
    expect(name).not.toHaveAttribute('readonly')
    fireEvent.change(name, { target: { value: 'Avery Chen-Smith' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Avery Chen-Smith' })).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/customers/customer-42'), expect.objectContaining({ method: 'PATCH' }))
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveValue('avery@example.com')
  })

  it('[AC-8] displays current active state and confirms deactivation before offering reactivation', async () => {
    const fetchMock = mockFetch({ ...customer, isActive: false })
    const confirmation = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CustomerDetail customer={customer} />)

    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Deactivate customer' })).toBeInTheDocument()
    expect(screen.getByText(/Deactivation does not delete existing tickets/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate customer' }))

    await waitFor(() => expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0))
    expect(confirmation).toHaveBeenCalledWith(expect.stringContaining('Existing tickets will remain intact'))
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/customers/customer-42/activation'), expect.objectContaining({ method: 'PATCH' }))
    expect(screen.getByRole('button', { name: 'Reactivate customer' })).toBeInTheDocument()
    confirmation.mockRestore()
  })
})
