import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminTicketList from './admin-ticket-list'
import { apiRequest } from '../lib/api-client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))
jest.mock('next/navigation', () => ({ usePathname: jest.fn(), useRouter: jest.fn(), useSearchParams: jest.fn() }))

const mockApiRequest = jest.mocked(apiRequest)
let currentQuery = ''
let lastSearch = '!'
let searchParamsSnapshot: URLSearchParams
const mockReplace = jest.fn((href: string) => {
  currentQuery = href.includes('?') ? href.slice(href.indexOf('?') + 1) : ''
})

beforeEach(() => {
  jest.clearAllMocks()
  currentQuery = ''
  lastSearch = '!'
  jest.mocked(usePathname).mockReturnValue('/admin/tickets')
  jest.mocked(useRouter).mockReturnValue({ replace: mockReplace } as unknown as ReturnType<typeof useRouter>)
  jest.mocked(useSearchParams).mockImplementation(() => {
    if (currentQuery !== lastSearch) {
      lastSearch = currentQuery
      searchParamsSnapshot = new URLSearchParams(currentQuery)
    }
    return searchParamsSnapshot as ReturnType<typeof useSearchParams>
  })
  mockApiRequest.mockImplementation((path) => {
    if (path === '/customers') return Promise.resolve({ customers: [{ id: 'cust-42', name: 'Priya Shah' }] }) as never
    return Promise.resolve([]) as never
  })
})

it('[AC-21] filters all tickets by status, severity, and customer and resets pagination', async () => {
  currentQuery = 'page=4'
  const view = render(<AdminTicketList />)
  await screen.findByRole('option', { name: 'Priya Shah' })

  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'NEW' } })
  expect(mockReplace).toHaveBeenLastCalledWith('/admin/tickets?status=NEW', { scroll: false })
  view.rerender(<AdminTicketList />)
  await waitFor(() => expect(mockApiRequest).toHaveBeenCalledWith('/tickets?status=NEW'))

  fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'HIGH' } })
  expect(mockReplace).toHaveBeenLastCalledWith('/admin/tickets?status=NEW&severity=HIGH', { scroll: false })
  view.rerender(<AdminTicketList />)
  await waitFor(() => expect(mockApiRequest).toHaveBeenCalledWith('/tickets?status=NEW&severity=HIGH'))

  fireEvent.change(screen.getByLabelText('Customer'), { target: { value: 'cust-42' } })
  expect(mockReplace).toHaveBeenLastCalledWith('/admin/tickets?status=NEW&severity=HIGH&customerId=cust-42', { scroll: false })
  view.rerender(<AdminTicketList />)
  await waitFor(() => expect(mockApiRequest).toHaveBeenCalledWith('/tickets?status=NEW&severity=HIGH&customerId=cust-42'))
})

it('[AC-22] restores URL filters on reload and browser navigation', async () => {
  currentQuery = 'status=IN_PROGRESS&severity=HIGH&customerId=cust-42&page=3'
  const view = render(<AdminTicketList />)

  await waitFor(() => {
    expect(screen.getByLabelText('Status')).toHaveValue('IN_PROGRESS')
    expect(screen.getByLabelText('Severity')).toHaveValue('HIGH')
    expect(screen.getByLabelText('Customer')).toHaveValue('cust-42')
  })
  await waitFor(() => expect(mockApiRequest).toHaveBeenCalledWith('/tickets?status=IN_PROGRESS&severity=HIGH&customerId=cust-42'))

  currentQuery = 'status=RESOLVED'
  view.rerender(<AdminTicketList />)
  await waitFor(() => expect(screen.getByLabelText('Status')).toHaveValue('RESOLVED'))
  expect(screen.getByLabelText('Severity')).toHaveValue('')
  expect(screen.getByLabelText('Customer')).toHaveValue('')
  await waitFor(() => expect(mockApiRequest).toHaveBeenCalledWith('/tickets?status=RESOLVED'))
})
