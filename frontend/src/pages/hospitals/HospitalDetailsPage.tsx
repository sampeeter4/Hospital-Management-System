import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Edit2,
  Power,
  Globe,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  Plus,
} from 'lucide-react'
import { hospitalApi } from '../../services/api/hospitalApi'
import { Hospital, Department } from '../../types/hospitals'
import {
  PageHeader,
  DetailField,
  ConfirmDialog,
  DataTable,
  Column,
} from '../../components/ui'
import { StatusBadge } from '../../components/dashboard'

export const HospitalDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Fetch Hospital Details
  const {
    data: hospital,
    isLoading: isLoadingHospital,
    error: hospitalError,
  } = useQuery<Hospital, Error>({
    queryKey: ['hospitals', id],
    queryFn: () => hospitalApi.getHospital(id!),
    enabled: !!id,
  })

  // Fetch Departments for this Hospital
  const {
    data: departments = [],
    isLoading: isLoadingDept,
  } = useQuery<Department[], Error>({
    queryKey: ['departments', { hospital: id }],
    queryFn: () => hospitalApi.getDepartments({ hospital: id }),
    enabled: !!id,
  })

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: () =>
      hospitalApi.updateHospital(id!, { is_active: !hospital?.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals', id] })
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      setIsConfirmOpen(false)
    },
  })

  if (isLoadingHospital) {
    return (
      <div className="max-w-5xl mx-auto p-8 animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  if (hospitalError || !hospital) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white border border-rose-200 rounded-lg my-10">
        <h3 className="text-base font-bold text-slate-900">Hospital Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          {hospitalError?.message || 'The requested hospital facility could not be loaded.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/hospitals')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md"
        >
          Return to Hospital Directory
        </button>
      </div>
    )
  }

  const deptColumns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Department Name',
      render: (d) => (
        <div>
          <Link
            to={`/departments/${d.id}`}
            className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
          >
            {d.name}
          </Link>
          <span className="block text-[11px] text-slate-400 font-mono">Code: {d.code}</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location / Floor',
      render: (d) => <span className="text-slate-700">{d.location || '—'}</span>,
    },
    {
      key: 'phone',
      header: 'Phone Extension',
      render: (d) => <span className="font-mono text-slate-600">{d.phone || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <StatusBadge
          status={d.is_active ? 'ACTIVE' : 'INACTIVE'}
          variant={d.is_active ? 'success' : 'neutral'}
        />
      ),
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={hospital.name}
        subtitle={`Registration: ${hospital.registration_number}`}
        backTo="/hospitals"
        backLabel="Back to Hospitals"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/hospitals/${hospital.id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Facility</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                hospital.is_active
                  ? 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
                  : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{hospital.is_active ? 'Deactivate' : 'Activate'}</span>
            </button>
          </div>
        }
      />

      {/* Main Details Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{hospital.name}</h2>
                <StatusBadge
                  status={hospital.is_active ? 'ACTIVE' : 'INACTIVE'}
                  variant={hospital.is_active ? 'success' : 'neutral'}
                />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                License: {hospital.registration_number}
              </p>
            </div>
          </div>

          {hospital.website && (
            <a
              href={hospital.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{hospital.website}</span>
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          <DetailField
            label="Phone"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {hospital.phone}
              </span>
            }
          />
          <DetailField
            label="Email"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {hospital.email}
              </span>
            }
          />
          <DetailField
            label="City & State"
            value={`${hospital.city}, ${hospital.state}`}
          />
          <DetailField label="Postal Code" value={hospital.postal_code} />
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DetailField
            label="Physical Street Address"
            value={
              <span className="inline-flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                {hospital.address}
              </span>
            }
          />
          <DetailField
            label="Registered In System"
            value={
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(hospital.created_at).toLocaleDateString()}
              </span>
            }
          />
        </div>
      </div>

      {/* Associated Departments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Departments in this Hospital ({departments.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/departments/new?hospital=${hospital.id}`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Department</span>
          </button>
        </div>

        <DataTable
          columns={deptColumns}
          data={departments}
          keyExtractor={(d) => d.id}
          isLoading={isLoadingDept}
          emptyTitle="No Departments Registered"
          emptyMessage="No clinical or operational departments have been assigned to this hospital yet."
        />
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => toggleStatusMutation.mutate()}
        title={hospital.is_active ? 'Deactivate Hospital' : 'Activate Hospital'}
        message={`Are you sure you want to ${
          hospital.is_active ? 'deactivate' : 'activate'
        } "${hospital.name}"?`}
        confirmText={hospital.is_active ? 'Deactivate' : 'Activate'}
        variant={hospital.is_active ? 'danger' : 'primary'}
        isLoading={toggleStatusMutation.isPending}
      />
    </div>
  )
}

export default HospitalDetailsPage

