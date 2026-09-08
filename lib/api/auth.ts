import { api, setToken, clearToken } from './client'

export interface UserProfile {
  id: number
  name: string
  email: string
  phone?: string
  role: 'customer' | 'worker' | 'admin'
  language: string
  created_at?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserProfile
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const result = await api<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (result?.access_token) {
    setToken(result.access_token)
  }
  return result
}

export async function register(payload: {
  name: string
  email: string
  password: string
  role: 'customer' | 'worker'
  phone?: string
  language?: string
  service?: string
  experience_years?: number
  hourly_rate?: number
  latitude?: number
  longitude?: number
}): Promise<AuthResponse> {
  const result = await api<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (result?.access_token) {
    setToken(result.access_token)
  }
  return result
}

export async function getCurrentUser(): Promise<UserProfile> {
  return api<UserProfile>('/auth/me')
}

export async function updateUser(payload: Partial<UserProfile>): Promise<UserProfile> {
  return api<UserProfile>('/users/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function logout(): void {
  clearToken()
}
