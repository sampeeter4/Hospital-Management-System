import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Edit2, Power, Building2, Layers } from 'lucide-react'
import { hospitalApi } from '../../services/api/hospitalApi'
import { Doctor, Department } from '../../types/hospitals'
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterBar,
  ConfirmDialog,
  Column,
} from '../../components/ui'
import { StatusBadge } from '../../components/dashboard'

export const DoctorListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [availFilter, setAvailFilter] = useState<string>('all')
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Fetch Departments for filter
  const { data: departments = [] } = useQuery<Department[], Error>({
    queryKey: ['departments'],
    queryFn: () => hospitalApi.getDepartments(),
  })

  // Fetch Doctors
  const { data: doctors = [], isLoading, error } = useQuery<Doctor[], Error>({
    queryKey: ['doctors', { department: deptFilter !== 'all' ? deptFilter : undefined }],
    queryFn: () =>
      hospitalApi.getDoctors(deptFilter !== 'all' ? { department: deptFilter } : undefined),
  })

  // Toggle availability mutation
  const toggleAvailMutation = useMutation({
    mutationFn: ({ id, is_available }: { id: number; is_available: boolean }) =>
      hospitalApi.updateDoctor(id, { is_available }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      setIsConfirmOpen(false)
      setSelectedDoctor(null)
    },
  })

  // Filter & Search
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const name = doc.doctor_name || ''
      const spec = doc.specialization || ''
      const docId = doc.doctor_id || ''
      const lic = doc.license_number || ''

      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spec.toLowerCase().includes(searchTerm.toLowerCase()) ||
        docId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lic.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesAvail =
        availFilter === 'all'
          ? true
          : availFilter === 'available'
          ? doc.is_available
          : !doc.is_available

      return matchesSearch && matchesAvail
    })
  }, [doctors, searchTerm, availFilter])

  const columns: Column<Doctor>[] = [
    {
      key: 'name',
      header: 'Physician / Specialist',
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
            {doc.doctor_name ? doc.doctor_name.charAt(0).toUpperCase() : 'D'}
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
      key: 'department',
      header: 'Department & Facility',
      render: (doc) => (
        <div className="text-[11px]">
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            {doc.department_name || `Dept #${doc.department}`}
          </span>
          <span className="text-slate-400 flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3 text-slate-400" />
            {doc.hospital_name || `Hospital #${doc.hospital}`}
          </span>
        </div>
      ),
    },
    {
      key: 'fee',
      header: 'Fee & Experience',
      render: (doc) => (
        <div>
          <span className="font-mono font-semibold text-slate-900">
            ₹{Number(doc.consultation_fee).toLocaleString()}
          </span>
          <span className="block text-[11px] text-slate-500">
            {doc.experience_years} years exp
          </span>
        </div>
      ),
    },
    {
      key: 'availability',
      header: 'Status',
      render: (doc) => (
        <StatusBadge
          status={doc.is_available ? 'AVAILABLE' : 'OFFLINE'}
          variant={doc.is_available ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (doc) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => navigate(`/doctors/${doc.id}`)}
            title="View profile"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/doctors/${doc.id}/edit`)}
            title="Edit profile"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDoctor(doc)
              setIsConfirmOpen(true)
            }}
            title={doc.is_available ? 'Mark offline' : 'Mark available'}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              doc.is_available
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
        title="Doctor Directory"
        subtitle="Manage hospital physicians, clinical consultants, and OPD scheduling availability"
        actions={
          <button
            type="button"
            onClick={() => navigate('/doctors/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Doctor</span>
          </button>
        }
      />

      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by physician name, specialty, ID..."
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
            value={availFilter}
            onChange={(e) => setAvailFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Availability</option>
            <option value="available">Available Only</option>
            <option value="offline">Offline Only</option>
          </select>
        </div>
      </FilterBar>

      {error && (
        <div className="p-4 mb-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load doctor directory: {error.message}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredDoctors}
        keyExtractor={(doc) => doc.id}
        isLoading={isLoading}
        emptyTitle="No Doctors Registered"
        emptyMessage="Click 'Add Doctor' to register a physician profile and assign them to a department."
      />

      {/* Confirm Availability Toggle Dialog */}
      {selectedDoctor && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false)
            setSelectedDoctor(null)
          }}
          onConfirm={() =>
            toggleAvailMutation.mutate({
              id: selectedDoctor.id,
              is_available: !selectedDoctor.is_available,
            })
          }
          title={selectedDoctor.is_available ? 'Mark Doctor Offline' : 'Mark Doctor Available'}
          message={`Are you sure you want to mark ${
            selectedDoctor.doctor_name || selectedDoctor.doctor_id
          } as ${selectedDoctor.is_available ? 'offline' : 'available for consultation'}?`}
          confirmText={selectedDoctor.is_available ? 'Set Offline' : 'Set Available'}
          variant={selectedDoctor.is_available ? 'warning' : 'primary'}
          isLoading={toggleAvailMutation.isPending}
        />
      )}
    </div>
  )
}

export default DoctorListPage
