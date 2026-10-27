import React from 'react'
import { Calendar, Building } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABELS } from '../../constants/roles'

interface DashboardHeaderProps {
  hospitalName?: string
  subtitle?: string
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  hospitalName = 'Central Hospital',
  subtitle,
}) => {
  const { user, role } = useAuth()

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'Staff User'

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Welcome back, {displayName}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {role ? ROLE_LABELS[role] : 'Medical Staff'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {subtitle || 'Hospital Operational & Clinical Overview'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 font-medium">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-[160px]">{hospitalName}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHeader

