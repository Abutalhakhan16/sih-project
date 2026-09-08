import { api } from './client'
import { SmartMatchResponse } from './workers'

export interface AIForecastResponse {
  service: string
  location: string
  date: string
  expected_requests: number
  source: string
}

export interface WorkforceRecommendationResponse {
  zone: string
  service: string
  predictedDemand: number
  availableSupply: number
  gap: number
  priority: string
  recommendation: string
  forecastSource: string
}

export async function getAIForecast(
  service?: string,
  location: string = 'Central Zone',
  targetDate?: string
): Promise<AIForecastResponse> {
  const params = new URLSearchParams({ location })
  if (service) params.set('service', service)
  if (targetDate) params.set('target_date', targetDate)
  return api<AIForecastResponse>(`/ai/forecast?${params.toString()}`)
}

export async function getWorkforceRecommendation(
  service?: string,
  location: string = 'Central Zone'
): Promise<WorkforceRecommendationResponse> {
  const params = new URLSearchParams({ location })
  if (service) params.set('service', service)
  return api<WorkforceRecommendationResponse>(`/ai/workforce-recommendation?${params.toString()}`)
}

export async function getAIMatch(
  latitude: number,
  longitude: number,
  service: string
): Promise<SmartMatchResponse> {
  return api<SmartMatchResponse>('/ai/match', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude, service }),
  })
}
