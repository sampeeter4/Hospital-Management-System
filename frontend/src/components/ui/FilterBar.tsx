import React, { ReactNode } from 'react'

interface FilterBarProps {
  children: ReactNode
  className?: string
}

export const FilterBar: React.FC<FilterBarProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        bg-white border border-slate-200 rounded-lg p-3.5 mb-5
        flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${className}
      `}
    >
      {children}
    </div>
  )
}

export default FilterBar
