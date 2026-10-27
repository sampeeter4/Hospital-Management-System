import React from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  badge?: string | number
  className?: string
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  action,
  badge,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between mb-3.5 ${className}`}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
          {badge !== undefined && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>

      {action && (
        action.href ? (
          <a
            href={action.href}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}

export default SectionHeader

