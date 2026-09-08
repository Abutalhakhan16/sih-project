import { api } from './client'
import { Worker, RankedWorker } from '@/lib/types'

export interface SmartMatchResponse {
  bestWorker: RankedWorker | null
  rankedWorkers: RankedWorker[]
  totalFound: number
  explanation: string
}

export async function getWorkers(service?: string, availability?: string): Promise<Worker[]> {
  const params = new URLSearchParams()
  if (service) params.set('service', service)
  if (availability) params.set('availability', availability)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return api<Worker[]>(`/workers${qs}`)
}

export async function getNearbyWorkers(
  latitude: number,
  longitude: number,
  service: string = '',
  radius: number = 15
): Promise<SmartMatchResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    service,
    radius: radius.toString(),
  })
  return api<SmartMatchResponse>(`/workers/nearby?${params.toString()}`)
}

export async function getWorker(id: number): Promise<Worker> {
  return api<Worker>(`/workers/${id}`)
}

export async function updateWorkerAvailability(
  id: number,
  availability: 'AVAILABLE' | 'BUSY' | 'ON_JOB' | 'OFFLINE' | 'ON_LEAVE' | string
): Promise<Worker> {
  return api<Worker>(`/workers/${id}/availability`, {
    method: 'PUT',
    body: JSON.stringify({ availability }),
  })
}

export async function updateWorkerLocation(
  id: number,
  latitude: number,
  longitude: number
): Promise<Worker> {
  return api<Worker>(`/workers/${id}/location`, {
    method: 'PUT',
    body: JSON.stringify({ latitude, longitude }),
  })
}

export async function updateWorkerProfile(
  id: number,
  payload: Partial<Worker>
): Promise<Worker> {
  return api<Worker>(`/workers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
