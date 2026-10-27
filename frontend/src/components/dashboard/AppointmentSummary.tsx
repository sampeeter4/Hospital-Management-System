import React from 'react'
import { Calendar } from 'lucide-react'
import StatusBadge from './StatusBadge'
import EmptyDashboardState from './EmptyDashboardState'

export interface AppointmentSummaryItem {
  id: string | number
  patientName: string
  mrn?: string
  doctorOrDept: string
  time: string
  status: string
}

interface AppointmentSummaryProps {
  appointments: AppointmentSummaryItem[]
  emptyMessage?: string
  className?: string
}

export const AppointmentSummary: React.FC<AppointmentSummaryProps> = ({
  appointments,
  emptyMessage = 'No appointments scheduled for today.',
  className = '',
}) => {
  if (appointments.length === 0) {
    return (
      <EmptyDashboardState
        title="No Appointments Today"
        description={emptyMessage}
        icon={Calendar}
        className={className}
      />
    )
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-3.5">Time</th>
              <th className="py-2.5 px-3.5">Patient</th>
              <th className="py-2.5 px-3.5">Department / Doctor</th>
              <th className="py-2.5 px-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {appointments.map((apt) => (
              <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-2.5 px-3.5 font-medium text-slate-900 whitespace-nowrap">
                  {apt.time}
                </td>
                <td className="py-2.5 px-3.5">
                  <div className="font-semibold text-slate-900">{apt.patientName}</div>
                  {apt.mrn && (
                    <span className="text-[10px] text-slate-400 font-mono">{apt.mrn}</span>
                  )}
                </td>
                <td className="py-2.5 px-3.5 text-slate-600 truncate max-w-[150px]">
                  {apt.doctorOrDept}
                </td>
                <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                  <StatusBadge status={apt.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AppointmentSummary

