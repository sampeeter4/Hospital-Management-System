import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import { billingApi } from '../../services/api/billingApi'
import { InsuranceClaim, InsuranceProvider, ClaimStatus } from '../../types/billing'
import {
  PageHeader,
  DataTable,
  Column,
  FilterBar,
  Pagination,
} from '../../components/ui'

const claimStatusColors: Record<ClaimStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIALLY_APPROVED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  SETTLED: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold',
}

export const InsuranceClaimsPage: React.FC = () => {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Fetch Claims
  const { data, isLoading, error } = useQuery({
    queryKey: ['insurance-claims-list', { page, status: statusFilter }],
    queryFn: () =>
      billingApi.getInsuranceClaims({
        page,
        status: statusFilter || undefined,
      }),
  })

  // Fetch Providers
  const { data: providersData } = useQuery({
    queryKey: ['insurance-providers'],
    queryFn: () => billingApi.getInsuranceProviders(),
  })
  const providers: InsuranceProvider[] = providersData?.results || []

  const claims = data?.results || []
  const totalCount = data?.count || 0
  const pageSize = 10
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const columns: Column<InsuranceClaim>[] = [
    {
      key: 'claim_reference',
      header: 'Claim Ref / Date',
      accessor: (row: InsuranceClaim) => (
        <div>
          <span className="font-mono font-bold text-slate-900">{row.claim_reference}</span>
          <p className="text-slate-400 text-[11px]">
            {new Date(row.submission_date).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient & Policy',
      accessor: (row: InsuranceClaim) => (
        <div>
          <p className="font-semibold text-slate-900">{row.patient_name || 'Patient #' + row.patient}</p>
          <span className="font-mono text-[11px] text-slate-500">
            {row.provider_name} • Policy {row.policy_number || 'Standard'}
          </span>
        </div>
      ),
    },
    {
      key: 'invoice',
      header: 'Invoice Ref',
      accessor: (row: InsuranceClaim) => (
        <span className="font-mono text-xs text-blue-700 font-medium">
          {row.invoice_number || `INV #${row.invoice}`}
        </span>
      ),
    },
    {
      key: 'claimed',
      header: 'Claimed Amount',
      accessor: (row: InsuranceClaim) => (
        <span className="font-mono font-semibold text-slate-900 text-xs">
          ${Number(row.claimed_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'approved',
      header: 'Approved Amount',
      accessor: (row: InsuranceClaim) => (
        <div>
          {row.approved_amount !== null && row.approved_amount !== undefined ? (
            <span className="font-mono font-bold text-emerald-700 text-xs">
              ${Number(row.approved_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">Pending adjudication</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Adjudication Status',
      accessor: (row: InsuranceClaim) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
            claimStatusColors[row.status] || 'bg-slate-100 text-slate-700'
          }`}
        >
          {row.status_display || row.status}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance Pre-Auth & Claims Adjudication"
        subtitle="Track policy verifications, third-party payer claims, and reimbursement settlements"
        backTo="/billing"
        backLabel="Back to Invoices"
      />

      {/* Contracted Payer Providers Overview */}
      {providers.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Contracted Insurance Payers ({providers.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <div
                key={p.id}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs flex items-center space-x-2"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-800">{p.name}</span>
                <span className="font-mono text-[10px] text-slate-500 bg-white px-1 rounded border border-slate-200">
                  {p.code}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar onReset={() => setStatusFilter('')}>
        <div className="flex items-center space-x-2">
          <label htmlFor="claim-status-filter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Adjudication Status:
          </label>
          <select
            id="claim-status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Claims</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="PARTIALLY_APPROVED">Partially Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SETTLED">Settled</option>
          </select>
        </div>
      </FilterBar>

      {/* Table */}
      <DataTable<InsuranceClaim>
        columns={columns}
        data={claims}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error ? 'Failed to retrieve insurance claims' : null}
        emptyMessage="No insurance claims recorded for this selection."
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
    </div>
  )
}
export default InsuranceClaimsPage
