import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Edit2, Power, Building2, Layers, Briefcase, Calendar } from 'lucide-react'
import { hospitalApi } from '../../services/api/hospitalApi'
import { Staff, Department } from '../../types/hospitals'
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterBar,
  ConfirmDialog,
  Column,
} from '../../components/ui'
import { StatusBadge } from '../../components/dashboard'

export const StaffListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Fetch Departments for filter
  const { data: departments = [] } = useQuery<Department[], Error>({
    queryKey: ['departments'],
    queryFn: () => hospitalApi.getDepartments(),
  })

  // Fetch Staff list
  const { data: staffList = [], isLoading, error } = useQuery<Staff[], Error>({
    queryKey: ['staff', { department: deptFilter !== 'all' ? deptFilter : undefined }],
    queryFn: () =>
      hospitalApi.getStaffList(deptFilter !== 'all' ? { department: deptFilter } : undefined),
  })

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      hospitalApi.updateStaff(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setIsConfirmOpen(false)
      setSelectedStaff(null)
    },
  })

  // Filter & Search
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const name = s.staff_name || ''
      const empId = s.employee_id || ''
      const desig = s.designation || ''

      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        desig.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? s.is_active
          : !s.is_active

      return matchesSearch && matchesStatus
    })
  }, [staffList, searchTerm, statusFilter])

  const columns: Column<Staff>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
            {s.staff_name ? s.staff_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <Link
              to={`/staff/${s.id}`}
              className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
            >
              {s.staff_name || `Staff #${s.id}`}
            </Link>
            <span className="block text-[11px] text-slate-400 font-mono">
              Emp ID: {s.employee_id}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'designation',
      header: 'Designation & Role',
      render: (s) => (
        <div className="flex items-center gap-1.5 text-slate-800">
          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold">{s.designation}</span>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department & Facility',
      render: (s) => (
        <div className="text-[11px]">
          <span className="font-medium text-slate-800 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            {s.department_name || (s.department ? `Dept #${s.department}` : 'Hospital General')}
          </span>
          <span className="text-slate-400 flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3 text-slate-400" />
            {s.hospital_name || `Hospital #${s.hospital}`}
          </span>
        </div>
      ),
    },
    {
      key: 'joining_date',
      header: 'Joined Date',
      render: (s) => (
        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span>{s.joining_date}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <StatusBadge
          status={s.is_active ? 'ACTIVE' : 'INACTIVE'}
          variant={s.is_active ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => navigate(`/staff/${s.id}`)}
            title="View details"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/staff/${s.id}/edit`)}
            title="Edit staff details"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedStaff(s)
              setIsConfirmOpen(true)
            }}
            title={s.is_active ? 'Deactivate staff member' : 'Activate staff member'}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              s.is_active
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
        title="Hospital Staff Directory"
        subtitle="Manage nurses, receptionists, technicians, pharmacists, and administrative personnel"
        actions={
          <button
            type="button"
            onClick={() => navigate('/staff/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        }
      />

      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by staff name, employee ID, designation..."
          className="w-full sm:w-72"
        />

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
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
          Failed to load staff directory: {error.message}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredStaff}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyTitle="No Staff Members Registered"
        emptyMessage="Click 'Add Staff Member' to record employment details and departmental assignments."
      />

      {/* Confirm Deactivation Dialog */}
      {selectedStaff && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false)
            setSelectedStaff(null)
          }}
          onConfirm={() =>
            toggleStatusMutation.mutate({
              id: selectedStaff.id,
              is_active: !selectedStaff.is_active,
            })
          }
          title={selectedStaff.is_active ? 'Deactivate Staff Member' : 'Activate Staff Member'}
          message={`Are you sure you want to ${
            selectedStaff.is_active ? 'deactivate' : 'activate'
          } ${selectedStaff.staff_name || selectedStaff.employee_id}?`}
          confirmText={selectedStaff.is_active ? 'Deactivate' : 'Activate'}
          variant={selectedStaff.is_active ? 'danger' : 'primary'}
          isLoading={toggleStatusMutation.isPending}
        />
      )}
    </div>
  )
}

export default StaffListPage
