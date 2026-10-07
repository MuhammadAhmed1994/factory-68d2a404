import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SignInForm from './sign-in-form'
import { createSession, type SessionResponse } from '../lib/session'
import { useRouter } from 'next/navigation'

jest.mock('../lib/session', () => ({ createSession: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

const mockCreateSession = jest.mocked(createSession)
const mockPush = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
})

describe('shared sign-in form', () => {
  it('[AC-1] provides an empty shared credential form without role or account recovery options', () => {
    render(<SignInForm />)

    expect(screen.getByRole('heading', { name: 'Sign in to SimpleDesk' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByText('Enter your work email and password.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /register|recover|forgot/i })).not.toBeInTheDocument()
  })

  it('[AC-2] displays pending status and prevents repeat submission while signing in', async () => {
    let resolveSession!: (value: SessionResponse) => void
    mockCreateSession.mockReturnValue(new Promise((resolve) => { resolveSession = resolve }))
    render(<SignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    const form = screen.getByLabelText('Email').closest('form')!

    fireEvent.submit(form)
    expect(await screen.findByRole('button', { name: 'Signing in…' })).toBeDisabled()
    fireEvent.submit(form)
    expect(mockCreateSession).toHaveBeenCalledTimes(1)

    resolveSession({ user: { id: '1', email: 'admin@example.com', name: 'Admin', role: 'admin' } })
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/tickets'))
  })

  it('[AC-3] shows the same generic error and preserves credentials after a recoverable failure', async () => {
    mockCreateSession.mockRejectedValue(new Error('Account inactive'))
    render(<SignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'entered-password' } })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't sign you in. Check your credentials and try again.")
    expect(screen.getByLabelText('Email')).toHaveValue('person@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('entered-password')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('[AC-4] routes to the appropriate workspace using the server-provided role', async () => {
    mockCreateSession.mockResolvedValueOnce({ user: { id: '1', email: 'admin@example.com', name: 'Admin', role: 'admin' } })
    const { unmount } = render(<SignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/tickets'))

    unmount()
    mockPush.mockClear()
    mockCreateSession.mockResolvedValueOnce({ user: { id: '2', email: 'customer@example.com', name: 'Customer', role: 'customer' } })
    render(<SignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'customer@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/tickets'))
  })
})
