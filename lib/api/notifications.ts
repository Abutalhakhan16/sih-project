import { api } from './client'
import { NotificationItem } from '@/lib/types'

export async function getNotifications(): Promise<NotificationItem[]> {
  return api<NotificationItem[]>('/notifications')
}

export async function markNotificationRead(notificationId: number | string): Promise<{ id: number; read: boolean }> {
  return api<{ id: number; read: boolean }>(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  })
}
