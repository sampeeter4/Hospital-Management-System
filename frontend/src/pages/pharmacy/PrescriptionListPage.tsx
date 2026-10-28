import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Pill,
  Plus,
  Eye,
  Package,
} from 'lucide-react'
import { pharmacyApi } from '../../services/api/pharmacyApi'
import {
  Prescription,
  PrescriptionStatus,
} from '../../types/pharmacy'
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterBar,
  Pagination,
} from '../../components/ui'

const STATUS_BADGES: Record<PrescriptionStatus, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  ISSUED: { label: 'Issued / Pending Dispense', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  PARTIALLY_DISPENSED: { label: 'Partially Dispensed', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  DISPENSED: { label: 'Fully Dispensed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
}

export const PrescriptionListPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<PrescriptionStatus | ''>('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Fetch Prescriptions
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['prescriptions', { page, search: searchTerm, status: selectedStatus }],
    queryFn: () =>
      pharmacyApi.getPrescriptions({
        page,
        page_size: pageSize,
        search: searchTerm || undefined,
        status: selectedStatus || undefined,
      }),
  })

  const prescriptions = data?.results || []
  const totalCount = data?.count || 0

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedStatus('')
    setPage(1)
  }

  const columns = [
    {
      key: 'reference',
      header: 'Prescription Ref',
      render: (rx: Prescription) => (
        <div>
          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {rx.prescription_reference}
          </span>
          <div className="text-[11px] text-slate-400 mt-1">
            {rx.items?.length || 0} medication(s) prescribed
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient Details',
      render: (rx: Prescription) => (
        <div>
          <button
            onClick={() => navigate(`/patients/${rx.patient}`)}
            className="font-semibold text-xs text-slate-900 hover:text-blue-600 hover:underline cursor-pointer text-left block"
          >
            {rx.patient_name || `Patient #${rx.patient}`}
          </button>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            MRN: {rx.patient_mrn}
          </div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Prescribing Physician',
      render: (rx: Prescription) => (
        <div className="text-xs font-medium text-slate-800">
          Dr. {rx.doctor_name || `Doctor #${rx.doctor}`}
          <div className="text-[11px] text-slate-500 font-normal">
            {rx.hospital_name || 'Central Hospital'}
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Prescribed Date',
      render: (rx: Prescription) => (
        <div className="text-xs font-mono text-slate-700">
          {new Date(rx.prescribed_date).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (rx: Prescription) => {
        const badge = STATUS_BADGES[rx.status] || STATUS_BADGES.DRAFT
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {badge.label}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (rx: Prescription) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/pharmacy/prescriptions/${rx.id}`)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Open Prescription Details"
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
        title="Prescriptions & Pharmacy Management"
        subtitle="Manage pharmaceutical prescriptions, outpatient dispensing queues, medicine catalogue, and stock levels"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/pharmacy/inventory')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-slate-500" />
              Medicine Inventory
            </button>
            <button
              onClick={() => navigate('/pharmacy/prescriptions/new')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Write Prescription
            </button>
          </div>
        }
      />

      {isError && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load prescriptions: {error.message}
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar onReset={handleResetFilters}>
        <div className="w-full sm:w-64">
          <SearchInput
            placeholder="Search Reference, Patient, Doctor..."
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
              setSelectedStatus(e.target.value as PrescriptionStatus | '')
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued / Pending</option>
            <option value="PARTIALLY_DISPENSED">Partially Dispensed</option>
            <option value="DISPENSED">Fully Dispensed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </FilterBar>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={prescriptions}
        isLoading={isLoading}
        keyExtractor={(rx) => rx.id}
        emptyState={
          <div className="py-12 text-center">
            <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-700">No prescriptions found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Create a new medical prescription or reset filters.
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

export default PrescriptionListPage

