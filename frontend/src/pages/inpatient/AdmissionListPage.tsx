import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, LayoutGrid } from 'lucide-react'
import { inpatientApi } from '../../services/api/inpatientApi'
import {
  Admission,
  AdmissionStatus,
  AdmissionType,
  DischargeDisposition,
} from '../../types/inpatient'
import {
  PageHeader,
  DataTable,
  Column,
  FilterBar,
  SearchInput,
  Pagination,
  ConfirmDialog,
} from '../../components/ui'

const statusColors: Record<AdmissionStatus, string> = {
  ADMITTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISCHARGED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const admissionTypeBadges: Record<AdmissionType, string> = {
  EMERGENCY: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
  URGENT: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
  ELECTIVE: 'bg-blue-50 text-blue-700 border-blue-200',
  TRANSFER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  NEWBORN: 'bg-teal-50 text-teal-700 border-teal-200',
}

export const AdmissionListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ADMITTED')
  const [typeFilter, setTypeFilter] = useState<string>('')

  // Discharge modal state
  const [dischargeAdmissionId, setDischargeAdmissionId] = useState<number | null>(null)
  const [dischargeDisposition, setDischargeDisposition] = useState<DischargeDisposition>('HOME_ROUTINE')
  const [dischargeInstructions, setDischargeInstructions] = useState('')
  const [dischargeSummary, setDischargeSummary] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['inpatient-admissions', { page, search, status: statusFilter, type: typeFilter }],
    queryFn: () =>
      inpatientApi.getAdmissions({
        page,
        search: search || undefined,
        status: (statusFilter as AdmissionStatus) || undefined,
        admission_type: (typeFilter as AdmissionType) || undefined,
      }),
  })

  const dischargeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { discharge_disposition: DischargeDisposition; discharge_instructions: string; discharge_summary: string } }) =>
      inpatientApi.dischargePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inpatient-admissions'] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-beds'] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-occupancy'] })
      setDischargeAdmissionId(null)
      setDischargeInstructions('')
      setDischargeSummary('')
    },
  })

  const admissions = data?.results || []
  const totalCount = data?.count || 0
  const pageSize = 10
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const columns: Column<Admission>[] = [
    {
      key: 'admission_reference',
      header: 'Admission Ref / Date',
      accessor: (row: Admission) => (
        <div>
          <span className="font-mono font-semibold text-slate-800">{row.admission_reference}</span>
          <p className="text-slate-400 text-[11px]">
            {new Date(row.admission_date).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Inpatient',
      accessor: (row: Admission) => (
        <div>
          <p className="font-medium text-slate-900">{row.patient_name || 'Patient #' + row.patient}</p>
          <span className="font-mono text-[11px] text-slate-500">MRN: {row.patient_mrn}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (row: Admission) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-[11px] border ${
            admissionTypeBadges[row.admission_type] || 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {row.admission_type_display || row.admission_type}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Assigned Ward & Bed',
      accessor: (row: Admission) => (
        <div>
          {row.current_bed ? (
            <div>
              <p className="font-semibold text-slate-800">
                {row.current_ward_name || 'Ward'} • Bed {row.current_bed}
              </p>
              <p className="text-[11px] text-slate-500">Room {row.current_room_number || 'Standard'}</p>
            </div>
          ) : (
            <span className="text-slate-400 italic text-xs">No active bed</span>
          )}
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Attending Physician',
      accessor: (row: Admission) => (
        <div>
          <p className="text-xs text-slate-800 font-medium">{row.doctor_name || 'Physician #' + row.attending_doctor}</p>
          <p className="text-[11px] text-slate-400">{row.hospital_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row: Admission) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
            statusColors[row.status] || 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          {row.status_display || row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (row: Admission) => (
        <div className="flex items-center space-x-2">
          <Link
            to={`/inpatient/admissions/${row.id}`}
            className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          >
            Review
          </Link>
          {row.status === 'ADMITTED' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setDischargeAdmissionId(row.id)
              }}
              className="px-2 py-1 text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors"
            >
              Discharge
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inpatient Admissions Roster"
        subtitle="Manage active patient hospitalizations, bed assignments, and discharge dispositions"
        action={{
          label: 'Admit New Patient',
          icon: <Plus className="w-4 h-4 mr-1" />,
          onClick: () => navigate('/inpatient/admissions/new'),
        }}
      >
        <Link
          to="/inpatient"
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
        >
          <LayoutGrid className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          Bed Census Grid
        </Link>
      </PageHeader>

      {/* Filter Bar */}
      <FilterBar
        onReset={() => {
          setSearch('')
          setStatusFilter('')
          setTypeFilter('')
          setPage(1)
        }}
      >
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val)
            setPage(1)
          }}
          placeholder="Search by Ref #, MRN, patient..."
          className="w-full sm:w-64"
        />

        <div className="flex items-center space-x-2">
          <label htmlFor="filter-status" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Status:
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ADMITTED">Active Admitted</option>
            <option value="DISCHARGED">Discharged</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="filter-type" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Intake Type:
          </label>
          <select
            id="filter-type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Intake Types</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="URGENT">Urgent</option>
            <option value="ELECTIVE">Elective</option>
            <option value="TRANSFER">Transfer</option>
            <option value="NEWBORN">Newborn</option>
          </select>
        </div>
      </FilterBar>

      {/* Table */}
      <DataTable<Admission>
        columns={columns}
        data={admissions}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error ? 'Failed to retrieve inpatient admissions' : null}
        emptyMessage="No inpatient admissions matching your query."
        onRowClick={(row: Admission) => navigate(`/inpatient/admissions/${row.id}`)}
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      )}

      {/* Discharge Dialog */}
      <ConfirmDialog
        isOpen={dischargeAdmissionId !== null}
        onClose={() => setDischargeAdmissionId(null)}
        title="Discharge Inpatient"
        confirmLabel="Authorize Discharge"
        isLoading={dischargeMutation.isPending}
        onConfirm={() => {
          if (dischargeAdmissionId) {
            dischargeMutation.mutate({
              id: dischargeAdmissionId,
              data: {
                discharge_disposition: dischargeDisposition,
                discharge_instructions: dischargeInstructions,
                discharge_summary: dischargeSummary,
              },
            })
          }
        }}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Discharge Disposition *
            </label>
            <select
              value={dischargeDisposition}
              onChange={(e) => setDischargeDisposition(e.target.value as DischargeDisposition)}
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="HOME_ROUTINE">Discharged Home (Routine / Clinically Improved)</option>
              <option value="HOME_CARE">Home with Home Healthcare / Nursing</option>
              <option value="TRANSFER_FACILITY">Transfer to another acute/specialized facility</option>
              <option value="AGAINST_ADVICE">Discharged Against Medical Advice (DAMA)</option>
              <option value="EXPIRED">Deceased / Expired</option>
              <option value="OTHER">Other Clinical Disposition</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Discharge Clinical Instructions
            </label>
            <textarea
              value={dischargeInstructions}
              onChange={(e) => setDischargeInstructions(e.target.value)}
              placeholder="Post-discharge wound care, rest, activity restrictions..."
              rows={2}
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Discharge Clinical Summary
            </label>
            <textarea
              value={dischargeSummary}
              onChange={(e) => setDischargeSummary(e.target.value)}
              placeholder="Hospital course summary, diagnosis upon discharge, treatment provided..."
              rows={2}
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
export default AdmissionListPage
