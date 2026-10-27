import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface QuickActionCardProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  to?: string
  onClick?: () => void
  badge?: string
  disabled?: boolean
  className?: string
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon: Icon,
  to,
  onClick,
  badge,
  disabled = false,
  className = '',
}) => {
  const content = (
    <div
      className={`
        flex items-start gap-3.5 p-3.5 bg-white border border-slate-200 rounded-lg text-left
        transition-all group relative
        ${
          disabled
            ? 'opacity-70 bg-slate-50 cursor-not-allowed'
            : 'hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer shadow-2xs'
        }
        ${className}
      `}
    >
      <div
        className={`
          w-9 h-9 rounded-md flex items-center justify-center shrink-0 border
          ${
            disabled
              ? 'bg-slate-100 text-slate-400 border-slate-200'
              : 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors'
          }
        `}
      >
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
            {title}
          </span>
          {badge && (
            <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
          {description}
        </p>
      </div>

      <ChevronRight
        className={`w-4 h-4 shrink-0 transition-transform ${
          disabled
            ? 'text-slate-300'
            : 'text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5'
        }`}
      />
    </div>
  )

  if (to && !disabled) {
    return <Link to={to} className="block">{content}</Link>
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="w-full block text-left"
    >
      {content}
    </button>
  )
}

export default QuickActionCard
