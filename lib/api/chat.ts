import { api } from './client'

export interface ChatActionPayload {
  action_type:
    | 'worker_recommendation'
    | 'booking_status'
    | 'emergency_alert'
    | 'worker_stats'
    | 'worker_jobs'
    | 'admin_analytics'
    | 'booking_confirmed'
    | 'services_list'
  data: Record<string, any>
}

export interface ChatMessage {
  id?: number
  sender: 'user' | 'assistant' | 'system'
  message: string
  timestamp?: string
  intent?: string
  language?: string
  action?: ChatActionPayload | null
  suggested_actions?: string[]
}

export interface ChatHistoryResponse {
  session_id: number
  messages: ChatMessage[]
}

export interface SendMessageOptions {
  language?: string
  latitude?: number
  longitude?: number
  address?: string
  service?: string
  context?: Record<string, any>
}

export async function sendMessage(
  message: string,
  options: SendMessageOptions = {}
): Promise<ChatMessage> {
  return api<ChatMessage>('/chat/message', {
    method: 'POST',
    body: JSON.stringify({
      message,
      language: options.language || 'en',
      latitude: options.latitude,
      longitude: options.longitude,
      address: options.address,
      service: options.service,
      context: options.context,
    }),
  })
}

export async function getHistory(): Promise<ChatHistoryResponse> {
  return api<ChatHistoryResponse>('/chat/history')
}

export async function clearHistory(): Promise<{ status: string; message: string }> {
  return api<{ status: string; message: string }>('/chat/history', {
    method: 'DELETE',
  })
}

export const chatApi = {
  sendMessage,
  getHistory,
  clearHistory,
}

