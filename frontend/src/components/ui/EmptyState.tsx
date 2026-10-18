import React from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-3">
        {icon || <Inbox className="w-6 h-6" aria-hidden="true" />}
      </div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default EmptyState

