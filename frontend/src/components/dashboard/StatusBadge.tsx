import React from 'react'

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'

interface StatusBadgeProps {
  status: string
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  size = 'sm',
  className = '',
}) => {
  // Infer variant from status if not provided explicitly
  const resolvedVariant = variant || inferVariant(status)

  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  }

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-md border
        ${variantStyles[resolvedVariant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {formatStatusText(status)}
    </span>
  )
}

function inferVariant(status: string): BadgeVariant {
  const s = status.toUpperCase().replace(/\s+/g, '_')
  if (['CONFIRMED', 'COMPLETED', 'AVAILABLE', 'ACTIVE', 'VERIFIED', 'PAID'].includes(s)) {
    return 'success'
  }
  if (['PENDING', 'REQUESTED', 'CHECKED_IN', 'IN_CONSULTATION', 'PARTIALLY_PAID', 'LOW_STOCK'].includes(s)) {
    return 'warning'
  }
  if (['CANCELLED', 'OVERDUE', 'URGENT', 'STAT', 'CRITICAL', 'VOID', 'NO_SHOW'].includes(s)) {
    return 'danger'
  }
  if (['OCCUPIED', 'ADMITTED', 'ISSUED', 'DISPENSED'].includes(s)) {
    return 'info'
  }
  return 'neutral'
}

function formatStatusText(status: string): string {
  if (!status) return ''
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default StatusBadge
