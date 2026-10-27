import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABELS } from '../../constants/roles'

interface ModulePlaceholderProps {
  title: string
  phaseNumber: number
  description: string
  icon?: React.ComponentType<{ className?: string }>
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  phaseNumber,
  description,
  icon: Icon = Clock,
}) => {
  const { role } = useAuth()

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-2xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              <span className="px-2 py-0.5 rounded-xs text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Phase {phaseNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enterprise Clinical & Operational Module
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-6 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800 mb-1">Module Schedule Notice</p>
          <p>{description}</p>
          <p className="mt-2 text-slate-500">
            Current Phase 3 implements the core application shell and role-based operational dashboards.
            Full CRUD workflows, forms, and clinical operations for {title} will be delivered in Frontend Phase {phaseNumber}.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authorized for your role: </span>
            <strong className="text-slate-800">{role ? ROLE_LABELS[role] : 'Staff'}</strong>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ModulePlaceholder
