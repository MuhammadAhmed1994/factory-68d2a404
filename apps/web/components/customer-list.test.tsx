import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import CustomerList from './customer-list'
import { apiRequest } from '../lib/api-client'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: (url: string) => window.history.replaceState({}, '', url) }),
  usePathname: () => '/admin/customers',
  useSearchParams: () => new URLSearchParams(window.location.search),
}))

jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))

const apiRequestMock = jest.mocked(apiRequest)

type CustomerFixture = { id: string; name: string; email: string; isActive: boolean; createdAt: string }

function customer(index: number, date: string): CustomerFixture {
  return {
    id: `customer-${index}`,
    name: `Customer ${index}`,
    email: `customer${index}@example.com`,
    isActive: index % 2 === 0,
    createdAt: date,
  }
}

function response(customers: CustomerFixture[], page: number, total: number) {
  return { customers, page, limit: 20, total }
}

describe('Customer list', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/customers')
    jest.clearAllMocks()
  })

  it('[AC-5] searches and displays customer name, email, active state, and local creation date', async () => {
    apiRequestMock.mockResolvedValue(response([
      { id: 'c1', name: 'Maya Chen', email: 'maya@example.com', isActive: true, createdAt: '2025-06-18T10:42:00.000Z' },
    ], 1, 1))
    render(<CustomerList />)

    const search = screen.getByRole('searchbox', { name: 'Search customers' })
    fireEvent.change(search, { target: { value: 'maya' } })

    expect(await screen.findByText('Maya Chen')).toBeInTheDocument()
    expect(screen.getByText('maya@example.com')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAccessibleName('Customer records, newest first')
    expect(search).toHaveValue('maya')
    await waitFor(() => expect(apiRequestMock).toHaveBeenLastCalledWith('/customers?page=1&search=maya', expect.objectContaining({ signal: expect.any(AbortSignal) })))
  })

  it('[AC-6] navigates newest-first result pages while showing no more than 20 customers per page', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => customer(index + 1, new Date(Date.UTC(2025, 5, 30 - index)).toISOString()))
    const secondPage = [customer(21, '2025-06-10T12:00:00.000Z')]
    apiRequestMock.mockImplementation(async (path) => {
      const page = Number(new URLSearchParams(path.split('?')[1]).get('page') ?? 1)
      return page === 1 ? response(firstPage, 1, 21) : response(secondPage, 2, 21)
    })
    render(<CustomerList />)

    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(21)
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Customer 1')
    expect(within(table).getAllByRole('row')[20]).toHaveTextContent('Customer 20')
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(await screen.findByText('Customer 21')).toBeInTheDocument()
    await waitFor(() => expect(apiRequestMock).toHaveBeenLastCalledWith('/customers?page=2', expect.objectContaining({ signal: expect.any(AbortSignal) })))
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(window.location.search).toBe('?page=2')
  })
})
