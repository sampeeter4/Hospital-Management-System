import { apiClient } from './client'
import { DashboardMetricsResponse, NotificationItem } from '../../types/dashboard'

export const dashboardApi = {
  /**
   * Fetches real role-customized dashboard metrics from the backend reports service.
   * Note: Backend blocks PATIENT role from staff reports; callers should guard this.
   */
  getMetrics: async (params?: { hospital?: number; start_date?: string; end_date?: string }): Promise<DashboardMetricsResponse> => {
    const response = await apiClient.get<DashboardMetricsResponse>('/reports/dashboard/', {
      params,
    })
    return response.data
  },

  /**
   * Fetches unread notifications count for the authenticated user.
   */
  getUnreadNotificationsCount: async (): Promise<number> => {
    try {
      const response = await apiClient.get<{ unread_count: number }>('/notifications/unread-count/')
      return response.data?.unread_count ?? 0
    } catch {
      return 0
    }
  },

  /**
   * Fetches recent notifications for the authenticated user.
   */
  getRecentNotifications: async (limit: number = 5): Promise<NotificationItem[]> => {
    try {
      const response = await apiClient.get<{ results?: NotificationItem[] } | NotificationItem[]>('/notifications/', {
        params: { page_size: limit, ordering: '-created_at' },
      })
      if (Array.isArray(response.data)) {
        return response.data
      }
      return response.data?.results ?? []
    } catch {
      return []
    }
  },

  /**
   * Marks a notification as read.
   */
  markNotificationRead: async (id: number): Promise<void> => {
    await apiClient.post(`/notifications/${id}/read/`)
  },
}

export default dashboardApi
