import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Edit2, Power, Layers, Phone, MapPin, Building2 } from 'lucide-react'
import { hospitalApi } from '../../services/api/hospitalApi'
import { Department, Hospital } from '../../types/hospitals'
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterBar,
  ConfirmDialog,
  Column,
} from '../../components/ui'
import { StatusBadge } from '../../components/dashboard'

export const DepartmentListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [hospitalFilter, setHospitalFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDept, setSelectedDept] = useState<Department | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Fetch Hospitals for filtering
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  // Fetch Departments
  const { data: departments = [], isLoading, error } = useQuery<Department[], Error>({
    queryKey: ['departments', { hospital: hospitalFilter !== 'all' ? hospitalFilter : undefined }],
    queryFn: () =>
      hospitalApi.getDepartments(
        hospitalFilter !== 'all' ? { hospital: hospitalFilter } : undefined
      ),
  })

  // Toggle active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      hospitalApi.updateDepartment(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setIsConfirmOpen(false)
      setSelectedDept(null)
    },
  })

  // Filter & Search
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? d.is_active
          : !d.is_active

      return matchesSearch && matchesStatus
    })
  }, [departments, searchTerm, statusFilter])

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Department',
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <Link
              to={`/departments/${d.id}`}
              className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
            >
              {d.name}
            </Link>
            <span className="block text-[11px] text-slate-400 font-mono">Code: {d.code}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'hospital_name',
      header: 'Hospital Facility',
      render: (d) => (
        <div className="flex items-center gap-1.5 text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium truncate max-w-[180px]">
            {d.hospital_name || `Hospital #${d.hospital}`}
          </span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Floor / Location',
      render: (d) => (
        <div className="flex items-center gap-1.5 text-slate-600">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{d.location || '—'}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Extension',
      render: (d) => (
        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
          <Phone className="w-3 h-3 text-slate-400" />
          <span>{d.phone || '—'}</span>
        </div>
      ),
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
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (d) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => navigate(`/departments/${d.id}`)}
            title="View details"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/departments/${d.id}/edit`)}
            title="Edit department"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDept(d)
              setIsConfirmOpen(true)
            }}
            title={d.is_active ? 'Deactivate department' : 'Activate department'}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              d.is_active
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
        title="Hospital Departments"
        subtitle="Manage clinical specialties, wards, and administrative units"
        actions={
          <button
            type="button"
            onClick={() => navigate('/departments/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        }
      />

      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by name, department code..."
          className="w-full sm:w-72"
        />

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Hospitals</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

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
          Failed to load departments: {error.message}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredDepartments}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
        emptyTitle="No Departments Found"
        emptyMessage="Click 'Add Department' to create the first medical department in this hospital."
      />

      {/* Confirm Deactivation/Activation Dialog */}
      {selectedDept && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false)
            setSelectedDept(null)
          }}
          onConfirm={() =>
            toggleStatusMutation.mutate({
              id: selectedDept.id,
              is_active: !selectedDept.is_active,
            })
          }
          title={selectedDept.is_active ? 'Deactivate Department' : 'Activate Department'}
          message={`Are you sure you want to ${
            selectedDept.is_active ? 'deactivate' : 'activate'
          } "${selectedDept.name}"? Active staff in deactivated departments may be impacted.`}
          confirmText={selectedDept.is_active ? 'Deactivate' : 'Activate'}
          variant={selectedDept.is_active ? 'danger' : 'primary'}
          isLoading={toggleStatusMutation.isPending}
        />
      )}
    </div>
  )
}

export default DepartmentListPage

