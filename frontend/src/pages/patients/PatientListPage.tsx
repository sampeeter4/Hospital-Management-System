import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  UserPlus,
  Users,
  Calendar,
  Eye,
  Edit2,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { patientApi } from '../../services/api/patientApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import { Patient, Gender, BloodGroup } from '../../types/patients'
import { Hospital } from '../../types/hospitals'
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterBar,
  Pagination,
} from '../../components/ui'

function calculateAge(dobString: string): number | string {
  if (!dobString) return '—'
  const dob = new Date(dobString)
  const diffMs = Date.now() - dob.getTime()
  const ageDt = new Date(diffMs)
  return Math.abs(ageDt.getUTCFullYear() - 1970)
}

export const PatientListPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGender, setSelectedGender] = useState<Gender | ''>('')
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup | ''>('')
  const [selectedHospital, setSelectedHospital] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Fetch hospitals for filter dropdown
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  // Fetch patients query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      'patients',
      { page, search: searchTerm, gender: selectedGender, blood_group: selectedBloodGroup, hospital: selectedHospital },
    ],
    queryFn: () =>
      patientApi.getPatients({
        page,
        page_size: pageSize,
        search: searchTerm || undefined,
        gender: selectedGender || undefined,
        blood_group: selectedBloodGroup || undefined,
        hospital: selectedHospital || undefined,
      }),
  })

  const patients = data?.results || []
  const totalCount = data?.count || 0

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedGender('')
    setSelectedBloodGroup('')
    setSelectedHospital('')
    setPage(1)
  }

  const columns = [
    {
      key: 'mrn',
      title: 'MRN / ID',
      render: (patient: Patient) => (
        <div>
          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {patient.mrn}
          </span>
          <div className="text-[11px] text-slate-400 mt-1">
            Reg: {new Date(patient.created_at).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'name',
      title: 'Patient Name & Contact',
      render: (patient: Patient) => (
        <div>
          <div className="font-semibold text-xs text-slate-800">
            {patient.patient_name || patient.username}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
            {patient.phone ? (
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3 h-3 text-slate-400" />
                {patient.phone}
              </span>
            ) : (
              <span>No phone recorded</span>
            )}
            {patient.email && <span>• {patient.email}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'demographics',
      title: 'Age / Gender',
      render: (patient: Patient) => (
        <div className="text-xs text-slate-700">
          <span className="font-medium">{calculateAge(patient.date_of_birth)} yrs</span>
          <span className="text-slate-400 ml-1.5 capitalize">({patient.gender?.toLowerCase()})</span>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            DOB: {patient.date_of_birth}
          </div>
        </div>
      ),
    },
    {
      key: 'blood_group',
      title: 'Blood Group',
      render: (patient: Patient) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
            patient.blood_group === 'UNKNOWN'
              ? 'bg-slate-100 text-slate-600 border-slate-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {patient.blood_group || 'UNKNOWN'}
        </span>
      ),
    },
    {
      key: 'hospital',
      title: 'Registered Facility',
      render: (patient: Patient) => (
        <div className="text-xs text-slate-700">
          {patient.hospital_name || 'Central Facility'}
          {patient.insurance_provider && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>{patient.insurance_provider}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      className: 'text-right',
      render: (patient: Patient) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/patients/${patient.id}`)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
            title="View Patient 360 Record"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/appointments/new?patient=${patient.id}`)}
            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
            title="Book Appointment"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/patients/${patient.id}/edit`)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
            title="Edit Patient Details"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Directory"
        subtitle="Comprehensive medical records, patient demographics, and clinical histories"
        actions={
          <button
            onClick={() => navigate('/patients/new')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Register New Patient
          </button>
        }
      />

      {isError && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load patient records: {error.message}
        </div>
      )}

      {/* Search & Filter Controls */}
      <FilterBar onReset={handleResetFilters}>
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Search MRN, Name, Phone, Email..."
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val)
              setPage(1)
            }}
          />
        </div>

        <div>
          <select
            value={selectedGender}
            onChange={(e) => {
              setSelectedGender(e.target.value as Gender | '')
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <select
            value={selectedBloodGroup}
            onChange={(e) => {
              setSelectedBloodGroup(e.target.value as BloodGroup | '')
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        <div>
          <select
            value={selectedHospital}
            onChange={(e) => {
              setSelectedHospital(e.target.value)
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Facilities</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={patients}
        isLoading={isLoading}
        keyExtractor={(p) => p.id}
        emptyState={
          <div className="py-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-700">No patients found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Try adjusting your search criteria or register a new patient.
            </p>
          </div>
        }
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={(newPage) => setPage(newPage)}
      />
    </div>
  )
}

export default PatientListPage
