import { api } from './client'

export interface RatingRecord {
  id: number
  booking_id: number
  customer_id: number
  worker_id: number
  rating: number
  review?: string
  created_at: string
}

export async function submitRating(payload: {
  booking_id: number
  rating: number
  review?: string
}): Promise<RatingRecord> {
  return api<RatingRecord>('/ratings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getWorkerRatings(worker_id: number): Promise<RatingRecord[]> {
  return api<RatingRecord[]>(`/workers/${worker_id}/ratings`)
}
