import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }

  const hasHeader = Boolean(title || subtitle || action)

  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden ${className}`}
      {...props}
    >
      {hasHeader && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
    </div>
  )
}

export default Card

