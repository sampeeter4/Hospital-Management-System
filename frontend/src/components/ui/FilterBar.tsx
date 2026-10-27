import React, { ReactNode } from 'react'

interface FilterBarProps {
  children: ReactNode
  className?: string
  onReset?: () => void
}

export const FilterBar: React.FC<FilterBarProps> = ({ children, className = '', onReset }) => {
  return (
    <div
      className={`
        bg-white border border-slate-200 rounded-lg p-3.5 mb-5
        flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${className}
      `}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap flex-1">
        {children}
      </div>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap cursor-pointer px-2 py-1"
        >
          Reset Filters
        </button>
      )}
    </div>
  )
}

export default FilterBar

