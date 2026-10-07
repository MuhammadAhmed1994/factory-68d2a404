import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminTicketList from './admin-ticket-list'
import { apiRequest } from '../lib/api-client'

const mockReplace = jest.fn()

jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))
jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/tickets',
  useRouter: () => ({
    replace: (url: string) => {
      mockReplace(url)
      window.history.replaceState({}, '', url)
    },
  }),
  useSearchParams: () => {
    const React = jest.requireActual<typeof import('react')>('react')
    const search = window.location.search
    return React.useMemo(() => new URLSearchParams(search), [search])
  },
}))

const apiRequestMock = jest.mocked(apiRequest)
const customer = { id: 'cust-7', name: 'Priya Shah' }
const ticket = {
  id: 'ticket-1',
  reference: 2841,
  title: 'Account access issue',
  status: 'NEW' as const,
  severity: 'HIGH' as const,
  updatedAt: '2026-06-12T10:42:00.000Z',
  customer,
}

beforeEach(() => {
  jest.clearAllMocks()
  window.history.replaceState({}, '', '/admin/tickets')
  apiRequestMock.mockImplementation(async (path) => {
    if (path === '/customers') return { customers: [customer] } as never
    return [ticket] as never
  })
})

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

it('[AC-21] filters all tickets by status, severity, and customer', async () => {
  render(<AdminTicketList />)
  expect(await screen.findByText('Account access issue')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'NEW' } })
  await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith('/tickets?status=NEW'))

  fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'HIGH' } })
  await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith('/tickets?status=NEW&severity=HIGH'))

  fireEvent.change(screen.getByLabelText('Customer'), { target: { value: 'cust-7' } })
  await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith('/tickets?status=NEW&severity=HIGH&customerId=cust-7'))
  expect(screen.getByRole('link', { name: 'Open ticket SD-2841: Account access issue' })).toBeInTheDocument()
})

it('[AC-22] keeps filters in the URL and restores them after reload', async () => {
  window.history.replaceState({}, '', '/admin/tickets?page=4')
  const firstRender = render(<AdminTicketList />)
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'RESOLVED' } })
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/admin/tickets?status=RESOLVED'))
  firstRender.unmount()

  window.history.replaceState({}, '', '/admin/tickets?status=RESOLVED&severity=MEDIUM&customerId=cust-7')
  render(<AdminTicketList />)

  await waitFor(() => {
    expect(screen.getByLabelText('Status')).toHaveValue('RESOLVED')
    expect(screen.getByLabelText('Severity')).toHaveValue('MEDIUM')
    expect(screen.getByLabelText('Customer')).toHaveValue('cust-7')
  })
  await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith('/tickets?status=RESOLVED&severity=MEDIUM&customerId=cust-7'))
})
