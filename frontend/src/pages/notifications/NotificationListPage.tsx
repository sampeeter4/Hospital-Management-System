import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  CheckCheck,
  AlertCircle,
  Settings,
  ExternalLink,
} from 'lucide-react'
import { notificationApi } from '../../services/api/notificationApi'
import {
  NotificationItem,
  NotificationPriority,
} from '../../types/notifications'
import { PageHeader, Pagination } from '../../components/ui'

const priorityStyles: Record<
  NotificationPriority,
  { badge: string; icon?: React.ReactNode }
> = {
  LOW: { badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  NORMAL: { badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  HIGH: { badge: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold' },
  CRITICAL: {
    badge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
    icon: <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />,
  },
}

export const NotificationListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-list', { page, is_read: unreadOnly ? false : undefined, priority: priorityFilter }],
    queryFn: () =>
      notificationApi.getNotifications({
        page,
        is_read: unreadOnly ? false : undefined,
        priority: priorityFilter || undefined,
        page_size: 15,
      }),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] })
    },
  })

  const notifications = data?.results || []
  const totalCount = data?.count || 0
  const pageSize = 15
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Notifications & Clinical Alerts"
        subtitle="Operational notices, critical diagnostic alerts, and appointment schedules"
      >
        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Mark All Read
          </button>
          <Link
            to="/notifications/preferences"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Preferences
          </Link>
        </div>
      </PageHeader>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(false)
              setPage(1)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              !unreadOnly ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Notifications
          </button>
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(true)
              setPage(1)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              unreadOnly ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Unread Only
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="priority-filter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Priority:
          </label>
          <select
            id="priority-filter"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              setPage(1)
            }}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical Alert</option>
            <option value="HIGH">High Priority</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border border-slate-200 text-xs text-slate-500">
          <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          No notifications found. You're all caught up!
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item: NotificationItem) => {
            const pStyle = priorityStyles[item.priority] || priorityStyles.NORMAL
            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg border transition-all ${
                  item.is_read
                    ? 'bg-white border-slate-200 opacity-85'
                    : 'bg-blue-50/30 border-blue-200 shadow-xs ring-1 ring-blue-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border ${pStyle.badge}`}>
                        {pStyle.icon}
                        {item.priority_display || item.priority}
                      </span>

                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                        {item.channel}
                      </span>

                      {!item.is_read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
                      )}

                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed pt-0.5">{item.message}</p>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                      <span>
                        {new Date(item.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {item.resource_type && (
                        <span>
                          Resource: <strong className="text-slate-600">{item.resource_type} #{item.resource_id}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate(item.id)}
                        className="px-2.5 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        Mark Read
                      </button>
                    )}

                    {item.action_url && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.is_read) markReadMutation.mutate(item.id)
                          navigate(item.action_url!)
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
export default NotificationListPage
