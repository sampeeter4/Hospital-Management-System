import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardApi } from '../../services/api/dashboardApi'
import { useAuth } from '../useAuth'
import { NotificationItem } from '../../types/dashboard'

export const useNotifications = () => {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const unreadCountQuery = useQuery<number, Error>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => dashboardApi.getUnreadNotificationsCount(),
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Poll every 1 minute
  })

  const recentNotificationsQuery = useQuery<NotificationItem[], Error>({
    queryKey: ['notifications', 'recent'],
    queryFn: () => dashboardApi.getRecentNotifications(5),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => dashboardApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return {
    unreadCount: unreadCountQuery.data ?? 0,
    isLoadingCount: unreadCountQuery.isLoading,
    notifications: recentNotificationsQuery.data ?? [],
    isLoadingNotifications: recentNotificationsQuery.isLoading,
    markAsRead: markReadMutation.mutate,
    isMarkingRead: markReadMutation.isPending,
  }
}

export default useNotifications

