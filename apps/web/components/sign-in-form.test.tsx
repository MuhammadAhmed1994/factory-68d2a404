import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SignInForm from './sign-in-form'
import { createSession } from '../lib/session'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('../lib/session', () => ({
  createSession: jest.fn(),
}))

const createSessionMock = jest.mocked(createSession)

function fillCredentials() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'person@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } })
}

describe('shared sign-in form', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('[AC-1] authenticates an admin and routes to the admin workspace', async () => {
    createSessionMock.mockResolvedValue({ user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' } })
    render(<SignInForm />)
    fillCredentials()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/tickets'))
    expect(createSessionMock).toHaveBeenCalledWith({ email: 'person@example.com', password: 'correct-horse' })
    expect(screen.getByRole('status')).toHaveTextContent('Signed in successfully.')
  })

  it('[AC-2] shows a pending label and prevents repeat submissions', async () => {
    let resolveSession: (value: Awaited<ReturnType<typeof createSession>>) => void = () => undefined
    createSessionMock.mockReturnValue(new Promise((resolve) => { resolveSession = resolve }))
    render(<SignInForm />)
    fillCredentials()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('button', { name: 'Signing in…' })).toBeDisabled()
    expect(createSessionMock).toHaveBeenCalledTimes(1)
    resolveSession({ user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' } })
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/tickets'))
  })

  it('[AC-3] shows the same generic error and preserves credentials after a rejected request', async () => {
    createSessionMock.mockRejectedValue(new Error('Account is inactive'))
    render(<SignInForm />)
    fillCredentials()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't sign you in. Check your credentials and try again.")
    expect(screen.getByLabelText('Email')).toHaveValue('person@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('correct-horse')
  })

  it('[AC-4] keeps empty fields available and routes an authenticated customer to their tickets', async () => {
    createSessionMock.mockResolvedValue({ user: { id: '2', name: 'Customer', email: 'customer@example.com', role: 'customer' } })
    render(<SignInForm />)

    expect(screen.getByRole('status')).toHaveTextContent('Enter your email and password to continue.')
    expect(screen.getByLabelText('Email')).toBeEnabled()
    expect(screen.getByLabelText('Password')).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(createSessionMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/tickets'))
  })
})
