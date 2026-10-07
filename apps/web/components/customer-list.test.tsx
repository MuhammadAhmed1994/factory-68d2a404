import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import CustomerList from './customer-list'
import { apiRequest } from '../lib/api-client'

jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))

const searchParams = new URLSearchParams()
const router = { push: jest.fn(), replace: jest.fn() }
jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/customers',
  useRouter: () => router,
  useSearchParams: () => searchParams,
}))

const request = apiRequest as jest.MockedFunction<typeof apiRequest>

type Customer = {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
}

function customer(index: number): Customer {
  return {
    id: `customer-${index}`,
    name: index === 1 ? 'Newest Customer' : `Customer ${index}`,
    email: `customer${index}@example.com`,
    isActive: index % 2 === 0,
    createdAt: new Date(Date.UTC(2025, 0, 25 - index)).toISOString(),
  }
}

function page(customers: Customer[], currentPage: number, total: number) {
  return { customers, page: currentPage, limit: 20, total }
}

beforeEach(() => {
  searchParams.delete('search')
  searchParams.delete('page')
  request.mockReset()
  router.push.mockReset()
  router.replace.mockReset()
  request.mockResolvedValue(page([customer(1)], 1, 1))
})

it('[AC-5] searches customer records and displays name, email, active state, and local creation time', async () => {
  searchParams.set('page', '2')
  request.mockImplementation(async (path) => {
    if (String(path).includes('search=maya')) return page([{
      ...customer(2),
      name: 'Maya Chen',
      email: 'maya.chen@example.com',
      isActive: true,
    }], 1, 1)
    return page([customer(1)], 2, 21)
  })

  render(<CustomerList />)
  expect(await screen.findByText('Newest Customer')).toBeInTheDocument()
  const search = screen.getByRole('searchbox', { name: 'Search customers' })
  fireEvent.change(search, { target: { value: 'maya' } })

  expect(await screen.findByText('Maya Chen')).toBeInTheDocument()
  expect(screen.getByText('maya.chen@example.com')).toBeInTheDocument()
  expect(screen.getByText('Active')).toBeInTheDocument()
  const createdAt = new Date(Date.UTC(2025, 0, 23))
  expect(screen.getByRole('time')).toHaveAttribute('datetime', createdAt.toISOString())
  expect(screen.getByRole('time')).toHaveTextContent(new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(createdAt))
  expect(request).toHaveBeenLastCalledWith('/customers?page=1&limit=20&search=maya', expect.anything())
  expect(router.replace).toHaveBeenCalledWith('/admin/customers?search=maya', { scroll: false })
})

it('[AC-6] navigates newest-first customer pages while limiting each rendered page to 20 records', async () => {
  request.mockImplementation(async (path) => {
    const requestedPage = new URL(`http://localhost${String(path)}`).searchParams.get('page')
    if (requestedPage === '2') return page(Array.from({ length: 5 }, (_, index) => customer(index + 21)), 2, 25)
    // Even if an unexpected response exceeds the API page-size contract, do not render over 20 records.
    return page(Array.from({ length: 21 }, (_, index) => customer(index + 1)), 1, 25)
  })

  render(<CustomerList />)
  const table = await screen.findByRole('table', { name: 'Customer records, newest first' })
  expect(within(table).getAllByRole('row')).toHaveLength(21)
  expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Newest Customer')
  expect(within(table).queryByText('Customer 21')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  await waitFor(() => expect(screen.getByText('Customer 21')).toBeInTheDocument())
  expect(request).toHaveBeenLastCalledWith('/customers?page=2&limit=20', expect.anything())
  expect(router.push).toHaveBeenCalledWith('/admin/customers?page=2', { scroll: false })
  expect(within(screen.getByRole('table', { name: 'Customer records, newest first' })).getAllByRole('row')).toHaveLength(6)
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
})
