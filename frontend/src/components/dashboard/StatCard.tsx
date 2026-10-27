import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: string
    isPositive?: boolean
  }
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  trend,
  icon: Icon,
  className = '',
}) => {
  return (
    <div
      className={`
        bg-white border border-slate-200 rounded-lg p-5
        hover:border-slate-300 transition-colors shadow-2xs ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trend.isPositive ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1 text-xs text-slate-500 truncate">{description}</p>
      )}
    </div>
  )
}

export default StatCard

