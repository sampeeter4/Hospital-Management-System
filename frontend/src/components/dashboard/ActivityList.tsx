import React from 'react'
import { Activity } from 'lucide-react'
import EmptyDashboardState from './EmptyDashboardState'

export interface ActivityItem {
  id: string | number
  title: string
  description: string
  timestamp: string
  icon?: React.ComponentType<{ className?: string }>
}

interface ActivityListProps {
  items: ActivityItem[]
  emptyMessage?: string
  className?: string
}

export const ActivityList: React.FC<ActivityListProps> = ({
  items,
  emptyMessage = 'No recent activity recorded today.',
  className = '',
}) => {
  if (items.length === 0) {
    return (
      <EmptyDashboardState
        title="No Recent Activity"
        description={emptyMessage}
        icon={Activity}
        className={className}
      />
    )
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 ${className}`}>
      {items.map((item) => {
        const Icon = item.icon || Activity
        return (
          <div key={item.id} className="p-3.5 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
            </div>
            <span className="text-[10px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
              {item.timestamp}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default ActivityList
