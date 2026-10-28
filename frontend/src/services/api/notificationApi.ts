import { apiClient } from './client'
import { NotificationItem, NotificationPreference } from '../../types/notifications'
import { PaginatedResponse } from '../../types'

export const notificationApi = {
  getNotifications: async (params?: {
    is_read?: boolean
    priority?: string
    channel?: string
    page?: number
    page_size?: number
    all?: boolean
  }): Promise<PaginatedResponse<NotificationItem>> => {
    const res = await apiClient.get<PaginatedResponse<NotificationItem>>('/notifications/', {
      params,
    })
    return res.data
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get<{ unread_count: number }>('/notifications/unread-count/')
    return res.data.unread_count
  },

  markRead: async (id: number): Promise<NotificationItem> => {
    const res = await apiClient.post<NotificationItem>(`/notifications/${id}/read/`, {})
    return res.data
  },

  markAllRead: async (): Promise<{ updated_count: number }> => {
    const res = await apiClient.post<{ updated_count: number }>(
      '/notifications/mark-all-read/',
      {}
    )
    return res.data
  },

  getPreferences: async (): Promise<NotificationPreference> => {
    const res = await apiClient.get<NotificationPreference>('/notifications/preferences/')
    return res.data
  },

  updatePreferences: async (
    data: Partial<NotificationPreference>
  ): Promise<NotificationPreference> => {
    const res = await apiClient.patch<NotificationPreference>(
      '/notifications/preferences/',
      data
    )
    return res.data
  },
}
