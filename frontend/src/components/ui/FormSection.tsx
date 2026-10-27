import React, { ReactNode } from 'react'

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-6 shadow-2xs mb-6 ${className}`}>
      <div className="border-b border-slate-100 pb-3.5 mb-5">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  )
}

export default FormSection
