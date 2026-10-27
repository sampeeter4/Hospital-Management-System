import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Edit2, Power, Phone, Mail, Building2 } from 'lucide-react'
import { hospitalApi } from '../../services/api/hospitalApi'
import { Hospital } from '../../types/hospitals'
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterBar,
  ConfirmDialog,
  Column,
} from '../../components/ui'
import { StatusBadge } from '../../components/dashboard'

export const HospitalListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Fetch Hospitals
  const { data: hospitals = [], isLoading, error } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  // Toggle active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      hospitalApi.updateHospital(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      setIsConfirmOpen(false)
      setSelectedHospital(null)
    },
  })

  // Filter & Search
  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.city.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? h.is_active
          : !h.is_active

      return matchesSearch && matchesStatus
    })
  }, [hospitals, searchTerm, statusFilter])

  const columns: Column<Hospital>[] = [
    {
      key: 'name',
      header: 'Hospital Name',
      render: (h) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <Link
              to={`/hospitals/${h.id}`}
              className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
            >
              {h.name}
            </Link>
            <span className="block text-[11px] text-slate-400 font-mono">
              Reg: {h.registration_number}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (h) => (
        <div>
          <span className="font-medium text-slate-800">{h.city}, {h.state}</span>
          <span className="block text-[11px] text-slate-400">{h.postal_code}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (h) => (
        <div className="space-y-0.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{h.phone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[150px]">{h.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (h) => (
        <StatusBadge
          status={h.is_active ? 'ACTIVE' : 'INACTIVE'}
          variant={h.is_active ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (h) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => navigate(`/hospitals/${h.id}`)}
            title="View details"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/hospitals/${h.id}/edit`)}
            title="Edit hospital"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedHospital(h)
              setIsConfirmOpen(true)
            }}
            title={h.is_active ? 'Deactivate hospital' : 'Activate hospital'}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              h.is_active
                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Hospital Facilities"
        subtitle="Manage hospital locations, registrations, and contact directories"
        actions={
          <button
            type="button"
            onClick={() => navigate('/hospitals/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hospital</span>
          </button>
        }
      />

      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by name, registration #, city..."
          className="w-full sm:w-72"
        />

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </FilterBar>

      {error && (
        <div className="p-4 mb-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load hospitals: {error.message}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredHospitals}
        keyExtractor={(h) => h.id}
        isLoading={isLoading}
        emptyTitle="No Hospitals Registered"
        emptyMessage="Click 'Add Hospital' to create the first medical facility in the system."
      />

      {/* Confirm Deactivation/Activation Dialog */}
      {selectedHospital && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false)
            setSelectedHospital(null)
          }}
          onConfirm={() =>
            toggleStatusMutation.mutate({
              id: selectedHospital.id,
              is_active: !selectedHospital.is_active,
            })
          }
          title={selectedHospital.is_active ? 'Deactivate Hospital' : 'Activate Hospital'}
          message={`Are you sure you want to ${
            selectedHospital.is_active ? 'deactivate' : 'activate'
          } "${selectedHospital.name}"? Deactivated facilities cannot accept new patient admissions.`}
          confirmText={selectedHospital.is_active ? 'Deactivate' : 'Activate'}
          variant={selectedHospital.is_active ? 'danger' : 'primary'}
          isLoading={toggleStatusMutation.isPending}
        />
      )}
    </div>
  )
}

export default HospitalListPage
