const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function isFormData(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

function getErrorMessage(details: unknown, status: number): string {
  if (typeof details === 'object' && details !== null && 'message' in details) {
    const message = details.message
    if (typeof message === 'string') return message
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) return message.join(', ')
  }
  if (typeof details === 'string' && details.length > 0) return details
  return `API request failed (${status})`
}

/** Calls the API with the browser's session cookie; cookie contents are never exposed to JavaScript. */
export async function apiRequest<T>(path: string, options: Omit<RequestInit, 'credentials'> = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body != null && !isFormData(options.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  const responseText = await response.text()
  let payload: unknown
  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      payload = responseText
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, getErrorMessage(payload, response.status), payload)
  }
  if (response.status === 204 || payload === undefined) return undefined as T
  return payload as T
}
