import { api } from './client'
import { Booking } from '@/lib/types'

export interface CreateBookingPayload {
  worker_id: number
  service: string
  service_id?: number
  request_id?: number
  customer_lat: number
  customer_lng: number
  address?: string
  amount: number
  eta_minutes?: number
}

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  return api<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getBookings(): Promise<Booking[]> {
  return api<Booking[]>('/bookings')
}

export async function getBooking(id: number): Promise<Booking> {
  return api<Booking>(`/bookings/${id}`)
}

export async function updateBookingStatus(
  id: number,
  status:
    | 'REQUESTED'
    | 'MATCHED'
    | 'ACCEPTED'
    | 'ON_THE_WAY'
    | 'ARRIVED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'PAID'
    | 'RATED'
    | 'CANCELLED'
    | 'REJECTED'
    | string,
  notes?: string
): Promise<Booking> {
  return api<Booking>(`/bookings/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes }),
  })
}

export async function cancelBooking(id: number): Promise<Booking> {
  return api<Booking>(`/bookings/${id}/cancel`, {
    method: 'POST',
  })
}
