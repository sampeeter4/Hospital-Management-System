import React from 'react'
import { AlertCircle, AlertTriangle, Info, BellOff } from 'lucide-react'
import EmptyDashboardState from './EmptyDashboardState'

export interface AlertItem {
  id: string | number
  title: string
  message: string
  severity: 'INFO' | 'WARNING' | 'DANGER' | 'URGENT'
  timestamp: string
}

interface AlertListProps {
  alerts: AlertItem[]
  onDismiss?: (id: string | number) => void
  emptyMessage?: string
  className?: string
}

export const AlertList: React.FC<AlertListProps> = ({
  alerts,
  onDismiss,
  emptyMessage = 'No active alerts or urgent items at this time.',
  className = '',
}) => {
  if (alerts.length === 0) {
    return (
      <EmptyDashboardState
        title="All Systems Normal"
        description={emptyMessage}
        icon={BellOff}
        className={className}
      />
    )
  }

  const severityConfig = {
    INFO: {
      icon: Info,
      style: 'bg-blue-50/50 border-blue-200 text-blue-900',
      iconStyle: 'text-blue-600',
    },
    WARNING: {
      icon: AlertTriangle,
      style: 'bg-amber-50/50 border-amber-200 text-amber-950',
      iconStyle: 'text-amber-600',
    },
    DANGER: {
      icon: AlertCircle,
      style: 'bg-rose-50/50 border-rose-200 text-rose-950',
      iconStyle: 'text-rose-600',
    },
    URGENT: {
      icon: AlertCircle,
      style: 'bg-rose-50 border-rose-300 text-rose-950',
      iconStyle: 'text-rose-700',
    },
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity] || severityConfig.INFO
        const Icon = config.icon

        return (
          <div
            key={alert.id}
            className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${config.style}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${config.iconStyle}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold truncate">{alert.title}</h4>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  {alert.timestamp}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 mt-0.5 line-clamp-2">
                {alert.message}
              </p>
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(alert.id)}
                className="text-[11px] text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded cursor-pointer"
                title="Dismiss"
              >
                ×
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default AlertList
