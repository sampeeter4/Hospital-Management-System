import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Edit2,
  Power,
  Building2,
  Layers,
  Briefcase,
  Calendar,
  Mail,
} from 'lucide-react'
import { hospitalApi } from '../../services/api/hospitalApi'
import { Staff } from '../../types/hospitals'
import { PageHeader, DetailField, ConfirmDialog } from '../../components/ui'
import { StatusBadge } from '../../components/dashboard'

export const StaffDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Fetch Staff Details
  const {
    data: staff,
    isLoading: isLoadingStaff,
    error: staffError,
  } = useQuery<Staff, Error>({
    queryKey: ['staff', id],
    queryFn: () => hospitalApi.getStaff(id!),
    enabled: !!id,
  })

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: () =>
      hospitalApi.updateStaff(id!, { is_active: !staff?.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', id] })
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setIsConfirmOpen(false)
    },
  })

  if (isLoadingStaff) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  if (staffError || !staff) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white border border-rose-200 rounded-lg my-10">
        <h3 className="text-base font-bold text-slate-900">Staff Record Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          {staffError?.message || 'The requested hospital staff record could not be located.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/staff')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md"
        >
          Return to Staff Directory
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={staff.staff_name || `Employee ${staff.employee_id}`}
        subtitle={staff.designation}
        backTo="/staff"
        backLabel="Back to Staff Directory"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/staff/${staff.id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Staff Details</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                staff.is_active
                  ? 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
                  : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{staff.is_active ? 'Deactivate' : 'Activate'}</span>
            </button>
          </div>
        }
      />

      {/* Main Staff Profile Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg shrink-0">
              {staff.staff_name ? staff.staff_name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{staff.staff_name || staff.employee_id}</h2>
                <StatusBadge
                  status={staff.is_active ? 'ACTIVE' : 'INACTIVE'}
                  variant={staff.is_active ? 'success' : 'neutral'}
                />
              </div>
              <p className="text-xs text-blue-700 font-semibold mt-0.5">{staff.designation}</p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Employee ID: {staff.employee_id}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          <DetailField
            label="Department"
            value={
              staff.department ? (
                <Link
                  to={`/departments/${staff.department}`}
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-semibold"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  {staff.department_name || `Dept #${staff.department}`}
                </Link>
              ) : (
                <span className="text-slate-600">Central / General Hospital</span>
              )
            }
          />
          <DetailField
            label="Hospital Facility"
            value={
              <Link
                to={`/hospitals/${staff.hospital}`}
                className="inline-flex items-center gap-1.5 text-slate-800 hover:text-blue-600 font-medium"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {staff.hospital_name || `Hospital #${staff.hospital}`}
              </Link>
            }
          />
          <DetailField
            label="Joining Date"
            value={
              <span className="inline-flex items-center gap-1.5 font-mono text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {staff.joining_date}
              </span>
            }
          />
          <DetailField
            label="Account Email"
            value={
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {staff.email || '—'}
              </span>
            }
          />
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DetailField
            label="Official Designation"
            value={
              <span className="inline-flex items-center gap-1.5 text-slate-800 font-semibold">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {staff.designation}
              </span>
            }
          />
          <DetailField
            label="Record Registered"
            value={
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(staff.created_at).toLocaleDateString()}
              </span>
            }
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => toggleStatusMutation.mutate()}
        title={staff.is_active ? 'Deactivate Staff Member' : 'Activate Staff Member'}
        message={`Are you sure you want to ${
          staff.is_active ? 'deactivate' : 'activate'
        } ${staff.staff_name || staff.employee_id}?`}
        confirmText={staff.is_active ? 'Deactivate' : 'Activate'}
        variant={staff.is_active ? 'danger' : 'primary'}
        isLoading={toggleStatusMutation.isPending}
      />
    </div>
  )
}

export default StaffDetailsPage
