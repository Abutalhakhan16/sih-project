import { api } from './client'
import {
  generateClientChatResponse,
  getStoredHistory,
  saveStoredHistory,
  clearStoredHistory,
} from '@/lib/chat/assistant'

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
  const userMsg: ChatMessage = {
    sender: 'user',
    message,
    timestamp: new Date().toISOString(),
  }

  try {
    const res = await api<ChatMessage>('/chat/message', {
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

    // Update local cache
    const current = getStoredHistory()
    saveStoredHistory([...current, userMsg, res])
    return res
  } catch (err) {
    // Backend offline / deleted: use intelligent client-side NLP assistant
    const reply = await generateClientChatResponse(message, options)
    const current = getStoredHistory()
    saveStoredHistory([...current, userMsg, reply])
    return reply
  }
}

export async function getHistory(): Promise<ChatHistoryResponse> {
  try {
    const res = await api<ChatHistoryResponse>('/chat/history')
    if (res && res.messages && res.messages.length > 0) {
      saveStoredHistory(res.messages)
      return res
    }
  } catch {}

  const localMessages = getStoredHistory()
  return {
    session_id: 1,
    messages: localMessages,
  }
}

export async function clearHistory(): Promise<{ status: string; message: string }> {
  try {
    await api<{ status: string; message: string }>('/chat/history', {
      method: 'DELETE',
    })
  } catch {}

  clearStoredHistory()
  return { status: 'success', message: 'Chat history cleared' }
}

export const chatApi = {
  sendMessage,
  getHistory,
  clearHistory,
}

