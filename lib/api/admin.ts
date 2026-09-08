import { api } from './client'
import { Worker, Booking, CoopStats } from '@/lib/types'

export async function getAdminDashboard(): Promise<CoopStats> {
  return api<CoopStats>('/admin/dashboard')
}

export async function getAdminAnalytics(): Promise<CoopStats> {
  return api<CoopStats>('/admin/analytics')
}

export async function getAdminWorkers(): Promise<Worker[]> {
  return api<Worker[]>('/admin/workers')
}

export async function getAdminBookings(): Promise<Booking[]> {
  return api<Booking[]>('/admin/bookings')
}

export async function verifyWorker(
  workerId: number,
  verification_status: 'VERIFIED' | 'REJECTED' | 'PENDING'
): Promise<Worker> {
  return api<Worker>(`/admin/workers/${workerId}/verify`, {
    method: 'PUT',
    body: JSON.stringify({ verification_status }),
  })
}
