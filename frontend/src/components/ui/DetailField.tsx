import React, { ReactNode } from 'react'

interface DetailFieldProps {
  label: string
  value?: ReactNode
  className?: string
  mono?: boolean
}

export const DetailField: React.FC<DetailFieldProps> = ({
  label,
  value,
  className = '',
  mono = false,
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <div className={`text-xs font-medium text-slate-900 leading-snug break-words ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </div>
    </div>
  )
}

export default DetailField

