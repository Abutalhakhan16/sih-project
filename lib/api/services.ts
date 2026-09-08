import { api } from './client'

export interface ServiceItem {
  id: number
  category: string
  name: string
  description?: string
  base_price: number
  estimated_duration: string
  required_skill?: string
  is_active: boolean
}

export async function getServices(): Promise<ServiceItem[]> {
  return api<ServiceItem[]>('/services')
}

export async function getService(id: number): Promise<ServiceItem> {
  return api<ServiceItem>(`/services/${id}`)
}

export async function createService(payload: {
  category: string
  name: string
  description?: string
  base_price: number
  estimated_duration?: string
  required_skill?: string
}): Promise<ServiceItem> {
  return api<ServiceItem>('/services', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateService(
  id: number,
  payload: Partial<ServiceItem>
): Promise<ServiceItem> {
  return api<ServiceItem>(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
