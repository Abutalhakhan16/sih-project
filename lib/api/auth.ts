import { api, setToken, clearToken } from './client'
import { Worker } from '@/lib/types'

export interface UserProfile {
  id: number
  name: string
  email: string
  phone?: string
  role: 'customer' | 'worker' | 'admin'
  language: string
  verification_status?: string
  availability_status?: string
  worker_id?: number
  customer_id?: number
  primary_skill?: string
  created_at?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserProfile
}

export async function login(
  identifier: string,
  password: string,
  rememberMe: boolean = false
): Promise<AuthResponse> {
  const result = await api<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
  if (result?.access_token) {
    setToken(result.access_token, rememberMe)
  }
  return result
}

export async function demoLogin(
  role: 'customer' | 'worker' | 'admin',
  rememberMe: boolean = false
): Promise<AuthResponse> {
  const result = await api<AuthResponse>('/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role }),
  })
  if (result?.access_token) {
    setToken(result.access_token, rememberMe)
  }
  return result
}

export async function register(payload: {
  name: string
  email: string
  password: string
  confirm_password?: string
  role: 'customer' | 'worker'
  phone?: string
  language?: string
  service?: string
  skills?: string[]
  experience_years?: number
  cooperative?: string
  cooperative_id?: number
  service_area?: string
  hourly_rate?: number
  latitude?: number
  longitude?: number
}): Promise<AuthResponse> {
  const result = await api<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (result?.access_token) {
    setToken(result.access_token, false)
  }
  return result
}

export async function getCurrentUser(): Promise<UserProfile> {
  return api<UserProfile>('/auth/me')
}

export async function getWorkerMe(): Promise<Worker> {
  return api<Worker>('/workers/me')
}

export async function updateUser(payload: Partial<UserProfile>): Promise<UserProfile> {
  return api<UserProfile>('/users/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST' })
  } catch {
    // Ignore network errors on logout
  } finally {
    clearToken()
  }
}
