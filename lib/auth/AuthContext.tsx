'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Role } from '@/lib/types'
import {
  UserProfile,
  AuthResponse,
  login as apiLogin,
  demoLogin as apiDemoLogin,
  register as apiRegister,
  getCurrentUser,
  logout as apiLogout,
} from '@/lib/api/auth'
import { clearToken, getToken } from '@/lib/api/client'

interface RegisterPayload {
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
  service_area?: string
  hourly_rate?: number
}

interface AuthContextType {
  user: UserProfile | null
  role: Role | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string
  setAuthError: (err: string) => void
  login: (identifier: string, pass: string, rememberMe?: boolean) => Promise<AuthResponse>
  demoLogin: (role: Role, rememberMe?: boolean) => Promise<AuthResponse>
  register: (payload: RegisterPayload) => Promise<AuthResponse>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [authError, setAuthError] = useState<string>('')

  // Restore authenticated session on initial load
  const restoreSession = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setRole(null)
      setIsLoading(false)
      return
    }

    try {
      const profile = await getCurrentUser()
      if (profile && profile.role) {
        setUser(profile)
        setRole(profile.role as Role)
      } else {
        clearToken()
        setUser(null)
        setRole(null)
      }
    } catch {
      let restoredUser: UserProfile | null = null
      if (typeof window !== 'undefined') {
        const stored =
          sessionStorage.getItem('coopserve_demo_user') ||
          localStorage.getItem('coopserve_demo_user')
        if (stored) {
          try {
            restoredUser = JSON.parse(stored) as UserProfile
          } catch {}
        }
      }

      if (restoredUser && restoredUser.role) {
        setUser(restoredUser)
        setRole(restoredUser.role as Role)
      } else {
        clearToken()
        setUser(null)
        setRole(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    restoreSession()

    // Listen for 401 unauthorized events from api client
    const handleUnauthorized = () => {
      // If in demo mode, ignore 401
      const isDemo =
        typeof window !== 'undefined' &&
        (sessionStorage.getItem('coopserve_demo_user') || localStorage.getItem('coopserve_demo_user'))
      if (isDemo) return

      setUser(null)
      setRole(null)
      setAuthError('Your session has expired. Please log in again.')
    }
    window.addEventListener('coopserve:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('coopserve:unauthorized', handleUnauthorized)
    }
  }, [restoreSession])

  const handleLogin = async (identifier: string, pass: string, rememberMe = false): Promise<AuthResponse> => {
    setAuthError('')
    try {
      const res = await apiLogin(identifier, pass, rememberMe)
      setUser(res.user)
      setRole(res.user.role as Role)
      return res
    } catch (err: any) {
      const msg = err?.message || 'Invalid email or password.'
      setAuthError(msg)
      throw err
    }
  }

  const handleDemoLogin = async (targetRole: Role, rememberMe = false): Promise<AuthResponse> => {
    setAuthError('')
    try {
      const res = await apiDemoLogin(targetRole as 'customer' | 'worker' | 'admin', rememberMe)
      setUser(res.user)
      setRole(res.user.role as Role)
      return res
    } catch (err: any) {
      const msg = err?.message || 'Unable to start demo session. Please try again.'
      setAuthError(msg)
      throw err
    }
  }

  const handleRegister = async (payload: RegisterPayload): Promise<AuthResponse> => {
    setAuthError('')
    try {
      const res = await apiRegister(payload)
      setUser(res.user)
      setRole(res.user.role as Role)
      return res
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please check your information.'
      setAuthError(msg)
      throw err
    }
  }

  const handleLogout = async (): Promise<void> => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
      setRole(null)
      setAuthError('')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        authError,
        setAuthError,
        login: handleLogin,
        demoLogin: handleDemoLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
