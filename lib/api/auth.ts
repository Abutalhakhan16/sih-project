import { api, setToken, clearToken } from './client'
import { Worker } from '@/lib/types'
import { initialWorkers } from '@/lib/mock-data'

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

export const DEMO_USERS: Record<'customer' | 'worker' | 'admin', UserProfile> = {
  customer: {
    id: 1,
    name: 'Ananya Nair',
    email: 'demo.customer@coopserve.test',
    phone: '+91 90000 00001',
    role: 'customer',
    language: 'en',
    customer_id: 1,
    created_at: '2026-01-15T10:00:00Z',
  },
  worker: {
    id: 101,
    name: 'Ramesh Verma',
    email: 'demo.worker@coopserve.test',
    phone: '+91 98451 22345',
    role: 'worker',
    language: 'hi',
    worker_id: 101,
    primary_skill: 'Plumber',
    verification_status: 'VERIFIED',
    availability_status: 'AVAILABLE',
    created_at: '2026-01-10T08:30:00Z',
  },
  admin: {
    id: 2,
    name: 'Cooperative Admin',
    email: 'demo.admin@coopserve.test',
    phone: '+91 90000 00002',
    role: 'admin',
    language: 'en',
    created_at: '2026-01-01T00:00:00Z',
  },
}

export async function demoLogin(
  role: 'customer' | 'worker' | 'admin',
  rememberMe: boolean = false
): Promise<AuthResponse> {
  try {
    const result = await api<AuthResponse>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
    if (result?.access_token) {
      setToken(result.access_token, rememberMe)
      if (typeof window !== 'undefined') {
        const storage = rememberMe ? localStorage : sessionStorage
        storage.setItem('coopserve_demo_user', JSON.stringify(result.user))
      }
    }
    return result
  } catch (err) {
    // Backend offline / unavailable fallback
    const mockUser = DEMO_USERS[role]
    const mockToken = `demo-token-${role}-${Date.now()}`
    setToken(mockToken, rememberMe)
    if (typeof window !== 'undefined') {
      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem('coopserve_demo_user', JSON.stringify(mockUser))
    }
    return {
      access_token: mockToken,
      token_type: 'bearer',
      user: mockUser,
    }
  }
}

export async function login(
  identifier: string,
  password: string,
  rememberMe: boolean = false
): Promise<AuthResponse> {
  try {
    const result = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
    if (result?.access_token) {
      setToken(result.access_token, rememberMe)
      if (typeof window !== 'undefined') {
        const storage = rememberMe ? localStorage : sessionStorage
        storage.setItem('coopserve_demo_user', JSON.stringify(result.user))
      }
    }
    return result
  } catch (err) {
    const cleanId = identifier.trim().toLowerCase()
    let matchedRole: 'customer' | 'worker' | 'admin' | null = null

    if (['demo.customer@coopserve.test', 'customer@coopserve.demo', '9000000001', 'customer'].includes(cleanId)) {
      matchedRole = 'customer'
    } else if (['demo.worker@coopserve.test', 'worker1@coopserve.demo', '9000000003', 'worker', '9845122345'].includes(cleanId)) {
      matchedRole = 'worker'
    } else if (['demo.admin@coopserve.test', 'admin@coopserve.demo', '9000000002', 'admin'].includes(cleanId)) {
      matchedRole = 'admin'
    }

    if (matchedRole) {
      return demoLogin(matchedRole, rememberMe)
    }

    throw err
  }
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
  try {
    return await api<UserProfile>('/auth/me')
  } catch (err) {
    if (typeof window !== 'undefined') {
      const stored =
        sessionStorage.getItem('coopserve_demo_user') ||
        localStorage.getItem('coopserve_demo_user')
      if (stored) {
        try {
          return JSON.parse(stored) as UserProfile
        } catch {}
      }
    }
    throw err
  }
}

export async function getWorkerMe(): Promise<Worker> {
  try {
    return await api<Worker>('/workers/me')
  } catch (err) {
    if (typeof window !== 'undefined') {
      const stored =
        sessionStorage.getItem('coopserve_demo_user') ||
        localStorage.getItem('coopserve_demo_user')
      if (stored) {
        try {
          const user = JSON.parse(stored) as UserProfile
          if (user.role === 'worker') {
            return initialWorkers[0]
          }
        } catch {}
      }
    }
    throw err
  }
}

export async function updateUser(payload: Partial<UserProfile>): Promise<UserProfile> {
  try {
    return await api<UserProfile>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  } catch (err) {
    if (typeof window !== 'undefined') {
      const stored =
        sessionStorage.getItem('coopserve_demo_user') ||
        localStorage.getItem('coopserve_demo_user')
      if (stored) {
        try {
          const current = JSON.parse(stored) as UserProfile
          const updated = { ...current, ...payload }
          const storage = localStorage.getItem('coopserve_demo_user') ? localStorage : sessionStorage
          storage.setItem('coopserve_demo_user', JSON.stringify(updated))
          return updated
        } catch {}
      }
    }
    throw err
  }
}

export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST' })
  } catch {
    // Ignore network errors on logout
  } finally {
    clearToken()
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('coopserve_demo_user')
      localStorage.removeItem('coopserve_demo_user')
    }
  }
}
