/**
 * Central HTTP client for Co-opServe frontend.
 * Provides unified request handling, JWT token management, and structured error responses.
 */

function getBaseUrl(): string {
  let url =
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL)) ||
    ''

  if (!url) {
    return 'http://localhost:8000/api'
  }

  // Remove any trailing slashes
  url = url.replace(/\/+$/, '')

  // Ensure /api prefix is present when pointing to the backend root domain
  if (url.startsWith('http') && !url.endsWith('/api')) {
    url = `${url}/api`
  }

  return url
}

const BASE_URL = getBaseUrl()

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('coopserve_token') || localStorage.getItem('coopserve_token')
}

export function setToken(token: string, rememberMe: boolean = false): void {
  if (typeof window === 'undefined') return
  if (rememberMe) {
    localStorage.setItem('coopserve_token', token)
    sessionStorage.removeItem('coopserve_token')
  } else {
    sessionStorage.setItem('coopserve_token', token)
    localStorage.removeItem('coopserve_token')
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('coopserve_token')
  localStorage.removeItem('coopserve_token')
  sessionStorage.removeItem('coopserve_demo_user')
  localStorage.removeItem('coopserve_demo_user')
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init.headers as Record<string, string>) || {}),
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const targetUrl = `${BASE_URL}${cleanPath}`

  const response = await fetch(targetUrl, {
    ...init,
    headers,
  })

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      clearToken()
      window.dispatchEvent(new CustomEvent('coopserve:unauthorized'))
    }
    const body = await response.json().catch(() => ({}))
    const message = body.detail || 'The request could not be completed. Please try again.'
    throw new ApiError(message, response.status)
  }

  return response.json() as Promise<T>
}

// Backward compatibility helper
export const coopserveApi = {
  login: (email: string, password: string) =>
    api<{ access_token: string; user: { role: 'customer' | 'worker' | 'admin'; name: string; email: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  workers: () => api('/workers'),
  nearbyWorkers: (latitude: number, longitude: number, service: string) =>
    api(`/workers/nearby?latitude=${latitude}&longitude=${longitude}&service=${encodeURIComponent(service)}`),
  bookings: () => api('/bookings'),
  notifications: () => api('/notifications'),
  dashboard: () => api('/admin/dashboard'),
  createBooking: (body: unknown) => api('/bookings', { method: 'POST', body: JSON.stringify(body) }),
}
