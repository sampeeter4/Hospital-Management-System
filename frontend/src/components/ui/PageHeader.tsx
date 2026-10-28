import React, { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  actions?: ReactNode
  action?: {
    label: string
    icon?: ReactNode
    onClick: () => void | Promise<void>
  }
  children?: ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  actions,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      {backTo && (
        <div className="mb-2">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

export default PageHeader

