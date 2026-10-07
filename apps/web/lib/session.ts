import { apiRequest } from './api-client'

export type UserRole = 'admin' | 'customer'

/** User identity and role supplied by the API after it validates the session. */
export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: UserRole
}

/** The session endpoint returns the authenticated user; the HTTP-only cookie remains browser-managed. */
export interface SessionResponse {
  user: AuthenticatedUser
}

export interface SessionCredentials {
  email: string
  password: string
}

/** Creates an authenticated session through the API and returns its server-authoritative identity. */
export function createSession(credentials: SessionCredentials): Promise<SessionResponse> {
  return apiRequest<SessionResponse>('/auth/session', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

/** Ends the current authenticated session through the API. */
export function endSession(): Promise<void> {
  return apiRequest<void>('/auth/session', { method: 'DELETE' })
}
