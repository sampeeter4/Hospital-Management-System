import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useDashboardData } from '../../hooks/dashboard/useDashboardData'
import { ROLES } from '../../constants/roles'
import { DashboardSkeleton } from '../../components/dashboard'

import SuperAdminDashboard from './SuperAdminDashboard'
import HospitalAdminDashboard from './HospitalAdminDashboard'
import DoctorDashboard from './DoctorDashboard'
import NurseDashboard from './NurseDashboard'
import ReceptionistDashboard from './ReceptionistDashboard'
import LabTechnicianDashboard from './LabTechnicianDashboard'
import PharmacistDashboard from './PharmacistDashboard'
import AccountantDashboard from './AccountantDashboard'
import PatientDashboard from './PatientDashboard'

export const DashboardPage: React.FC = () => {
  const { role } = useAuth()
  const { data: metrics, isLoading, isError, error, refetch } = useDashboardData()

  // Loading State with Hospital-Grade Skeleton
  if (isLoading && role !== ROLES.PATIENT) {
    return <DashboardSkeleton />
  }

  // Error State with Recovery Action (Section 23)
  if (isError && role !== ROLES.PATIENT) {
    return (
      <div className="bg-white border border-rose-200 rounded-lg p-8 max-w-lg mx-auto text-center my-8 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mx-auto mb-4 border border-rose-100">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">
          Unable to Load Hospital Dashboard Information
        </h2>
        <p className="text-xs text-slate-500 mt-2">
          {error?.message || 'A network error occurred while communicating with the hospital metrics service.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      </div>
    )
  }

  // Role-Based Dashboard Selection (Section 7 & 26)
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return <SuperAdminDashboard metrics={metrics} />

    case ROLES.HOSPITAL_ADMIN:
      return <HospitalAdminDashboard metrics={metrics} />

    case ROLES.DOCTOR:
      return <DoctorDashboard metrics={metrics} />

    case ROLES.NURSE:
      return <NurseDashboard metrics={metrics} />

    case ROLES.RECEPTIONIST:
      return <ReceptionistDashboard metrics={metrics} />

    case ROLES.LAB_TECHNICIAN:
      return <LabTechnicianDashboard metrics={metrics} />

    case ROLES.PHARMACIST:
      return <PharmacistDashboard metrics={metrics} />

    case ROLES.ACCOUNTANT:
      return <AccountantDashboard metrics={metrics} />

    case ROLES.PATIENT:
      return <PatientDashboard />

    default:
      return <HospitalAdminDashboard metrics={metrics} />
  }
}

export default DashboardPage
