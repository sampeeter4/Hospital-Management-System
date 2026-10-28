import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Plus,
  Eye,
} from 'lucide-react'
import { medicalRecordApi } from '../../services/api/medicalRecordApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import {
  ClinicalEncounter,
  EncounterStatus,
  EncounterType,
} from '../../types/medicalRecords'
import { Doctor } from '../../types/hospitals'
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterBar,
  Pagination,
} from '../../components/ui'

export const MedicalRecordListPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<EncounterStatus | ''>('')
  const [selectedType, setSelectedType] = useState<EncounterType | ''>('')
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Fetch Doctors for filter
  const { data: doctors = [] } = useQuery<Doctor[], Error>({
    queryKey: ['doctors'],
    queryFn: () => hospitalApi.getDoctors(),
  })

  // Fetch Encounters
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      'encounters',
      { page, search: searchTerm, status: selectedStatus, encounter_type: selectedType, doctor: selectedDoctor },
    ],
    queryFn: () =>
      medicalRecordApi.getEncounters({
        page,
        page_size: pageSize,
        search: searchTerm || undefined,
        status: selectedStatus || undefined,
        encounter_type: selectedType || undefined,
        doctor: selectedDoctor || undefined,
      }),
  })

  const encounters = data?.results || []
  const totalCount = data?.count || 0

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedStatus('')
    setSelectedType('')
    setSelectedDoctor('')
    setPage(1)
  }

  const columns = [
    {
      key: 'reference',
      header: 'Encounter Reference',
      render: (enc: ClinicalEncounter) => (
        <div>
          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {enc.encounter_reference}
          </span>
          <div className="text-[11px] text-slate-400 mt-1 capitalize">
            {enc.encounter_type.toLowerCase().replace('_', ' ')}
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient Details',
      render: (enc: ClinicalEncounter) => (
        <div>
          <button
            onClick={() => navigate(`/patients/${enc.patient}`)}
            className="font-semibold text-xs text-slate-900 hover:text-blue-600 hover:underline cursor-pointer text-left block"
          >
            {enc.patient_name || `Patient #${enc.patient}`}
          </button>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            MRN: {enc.patient_mrn}
          </div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Attending Doctor',
      render: (enc: ClinicalEncounter) => (
        <div className="text-xs font-medium text-slate-800">
          Dr. {enc.doctor_name || `Physician #${enc.doctor}`}
          <div className="text-[11px] text-slate-500 font-normal">
            {enc.department_name || enc.hospital_name}
          </div>
        </div>
      ),
    },
    {
      key: 'complaint',
      header: 'Chief Complaint',
      render: (enc: ClinicalEncounter) => (
        <p className="text-xs text-slate-700 max-w-xs truncate" title={enc.chief_complaint}>
          {enc.chief_complaint}
        </p>
      ),
    },
    {
      key: 'date',
      header: 'Encounter Date',
      render: (enc: ClinicalEncounter) => (
        <div className="text-xs font-mono text-slate-700">
          {enc.encounter_date}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (enc: ClinicalEncounter) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
            enc.status === 'OPEN'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {enc.status === 'OPEN' ? 'Active / Open' : 'Closed / Archived'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (enc: ClinicalEncounter) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/medical-records/encounters/${enc.id}`)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
            title="Open Clinical Encounter"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Electronic Medical Records (EMR)"
        subtitle="Patient clinical encounters, diagnoses, SOAP clinical progress notes, and vital signs logs"
        actions={
          <button
            onClick={() => navigate('/medical-records/encounters/new')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Clinical Encounter
          </button>
        }
      />

      {isError && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load medical records: {error.message}
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar onReset={handleResetFilters}>
        <div className="w-full sm:w-64">
          <SearchInput
            placeholder="Search Reference, Patient, MRN..."
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val)
              setPage(1)
            }}
          />
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as EncounterStatus | '')
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open Encounters</option>
            <option value="CLOSED">Closed Encounters</option>
          </select>
        </div>

        <div>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as EncounterType | '')
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="OUTPATIENT">Outpatient Consultation</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="INPATIENT">Inpatient Round</option>
            <option value="TELEHEALTH">Telehealth</option>
            <option value="FOLLOW_UP">Follow-up</option>
          </select>
        </div>

        <div>
          <select
            value={selectedDoctor}
            onChange={(e) => {
              setSelectedDoctor(e.target.value)
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Physicians</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.doctor_name}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={encounters}
        isLoading={isLoading}
        keyExtractor={(enc) => enc.id}
        emptyState={
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-700">No clinical encounters found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Start a new clinical consultation or clear active filters.
            </p>
          </div>
        }
      />

      <Pagination
        currentPage={page}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={(newPage) => setPage(newPage)}
      />
    </div>
  )
}

export default MedicalRecordListPage
