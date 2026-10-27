import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Layers,
  Edit2,
  Power,
  Building2,
  MapPin,
  Phone,
  Calendar,
  Stethoscope,
  Plus,
} from 'lucide-react'
import { hospitalApi } from '../../services/api/hospitalApi'
import { Department, Doctor } from '../../types/hospitals'
import {
  PageHeader,
  DetailField,
  ConfirmDialog,
  DataTable,
  Column,
} from '../../components/ui'
import { StatusBadge } from '../../components/dashboard'

export const DepartmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Fetch Department
  const {
    data: department,
    isLoading: isLoadingDept,
    error: deptError,
  } = useQuery<Department, Error>({
    queryKey: ['departments', id],
    queryFn: () => hospitalApi.getDepartment(id!),
    enabled: !!id,
  })

  // Fetch Doctors in this Department
  const {
    data: doctors = [],
    isLoading: isLoadingDoctors,
  } = useQuery<Doctor[], Error>({
    queryKey: ['doctors', { department: id }],
    queryFn: () => hospitalApi.getDoctors({ department: id }),
    enabled: !!id,
  })

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: () =>
      hospitalApi.updateDepartment(id!, { is_active: !department?.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', id] })
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setIsConfirmOpen(false)
    },
  })

  if (isLoadingDept) {
    return (
      <div className="max-w-5xl mx-auto p-8 animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  if (deptError || !department) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white border border-rose-200 rounded-lg my-10">
        <h3 className="text-base font-bold text-slate-900">Department Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          {deptError?.message || 'The requested hospital department could not be loaded.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/departments')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md"
        >
          Return to Departments
        </button>
      </div>
    )
  }

  const doctorColumns: Column<Doctor>[] = [
    {
      key: 'doctor_name',
      header: 'Doctor Name',
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
            {doc.doctor_name ? doc.doctor_name.charAt(0) : 'D'}
          </div>
          <div>
            <Link
              to={`/doctors/${doc.id}`}
              className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
            >
              {doc.doctor_name || `Doctor #${doc.id}`}
            </Link>
            <span className="block text-[11px] text-slate-400 font-mono">
              ID: {doc.doctor_id} • Lic: {doc.license_number}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'specialization',
      header: 'Specialization & Qualification',
      render: (doc) => (
        <div>
          <span className="font-semibold text-slate-800">{doc.specialization}</span>
          <span className="block text-[11px] text-slate-500">{doc.qualification}</span>
        </div>
      ),
    },
    {
      key: 'fee',
      header: 'Consultation Fee',
      render: (doc) => (
        <span className="font-mono font-semibold text-slate-800">
          ₹{Number(doc.consultation_fee).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'availability',
      header: 'Availability',
      render: (doc) => (
        <StatusBadge
          status={doc.is_available ? 'AVAILABLE' : 'OFFLINE'}
          variant={doc.is_available ? 'success' : 'neutral'}
        />
      ),
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={department.name}
        subtitle={`Department Code: ${department.code}`}
        backTo="/departments"
        backLabel="Back to Departments"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/departments/${department.id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Department</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                department.is_active
                  ? 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
                  : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{department.is_active ? 'Deactivate' : 'Activate'}</span>
            </button>
          </div>
        }
      />

      {/* Main Department Info Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{department.name}</h2>
                <StatusBadge
                  status={department.is_active ? 'ACTIVE' : 'INACTIVE'}
                  variant={department.is_active ? 'success' : 'neutral'}
                />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {department.code}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          <DetailField
            label="Hospital Facility"
            value={
              <Link
                to={`/hospitals/${department.hospital}`}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-semibold"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {department.hospital_name || `Hospital #${department.hospital}`}
              </Link>
            }
          />
          <DetailField
            label="Floor / Location"
            value={
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {department.location || '—'}
              </span>
            }
          />
          <DetailField
            label="Extension / Phone"
            value={
              <span className="inline-flex items-center gap-1.5 font-mono text-slate-700">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {department.phone || '—'}
              </span>
            }
          />
          <DetailField
            label="Created Date"
            value={
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(department.created_at).toLocaleDateString()}
              </span>
            }
          />
        </div>

        {department.description && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <DetailField
              label="Clinical Scope & Description"
              value={<p className="text-slate-700 leading-relaxed">{department.description}</p>}
            />
          </div>
        )}
      </div>

      {/* Associated Doctors Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Department Physicians & Specialists ({doctors.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate(`/doctors/new?hospital=${department.hospital}&department=${department.id}`)
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Doctor to Department</span>
          </button>
        </div>

        <DataTable
          columns={doctorColumns}
          data={doctors}
          keyExtractor={(doc) => doc.id}
          isLoading={isLoadingDoctors}
          emptyTitle="No Doctors Assigned"
          emptyMessage="No doctors or specialists have been assigned to this department yet."
        />
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => toggleStatusMutation.mutate()}
        title={department.is_active ? 'Deactivate Department' : 'Activate Department'}
        message={`Are you sure you want to ${
          department.is_active ? 'deactivate' : 'activate'
        } "${department.name}"?`}
        confirmText={department.is_active ? 'Deactivate' : 'Activate'}
        variant={department.is_active ? 'danger' : 'primary'}
        isLoading={toggleStatusMutation.isPending}
      />
    </div>
  )
}

export default DepartmentDetailsPage
