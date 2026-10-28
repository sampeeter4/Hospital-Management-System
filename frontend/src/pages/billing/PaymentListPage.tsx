import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { billingApi } from '../../services/api/billingApi'
import { patientApi } from '../../services/api/patientApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import { Payment, PaymentMethod, PaymentInput } from '../../types/billing'
import { Patient } from '../../types/patients'
import { Hospital } from '../../types/hospitals'
import {
  PageHeader,
  DataTable,
  Column,
  FilterBar,
  SearchInput,
  Pagination,
  ConfirmDialog,
} from '../../components/ui'

const paymentMethodBadges: Record<PaymentMethod, string> = {
  CASH: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CREDIT_CARD: 'bg-blue-50 text-blue-800 border-blue-200',
  DEBIT_CARD: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  UPI: 'bg-purple-50 text-purple-800 border-purple-200',
  BANK_TRANSFER: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  CHEQUE: 'bg-amber-50 text-amber-800 border-amber-200',
  INSURANCE_DIRECT: 'bg-teal-50 text-teal-800 border-teal-200',
}

export const PaymentListPage: React.FC = () => {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('')

  // New Payment modal
  const [isRecordOpen, setIsRecordOpen] = useState(false)
  const [payPatientId, setPayPatientId] = useState<number | undefined>(undefined)
  const [payHospitalId, setPayHospitalId] = useState<number | undefined>(undefined)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH')
  const [payTxnId, setPayTxnId] = useState('')
  const [payNotes, setPayNotes] = useState('')

  // Fetch Payments
  const { data, isLoading, error } = useQuery({
    queryKey: ['payments-list', { page, search, method: methodFilter }],
    queryFn: () =>
      billingApi.getPayments({
        page,
        search: search || undefined,
        payment_method: (methodFilter as PaymentMethod) || undefined,
      }),
  })

  // Fetch Patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients-picker'],
    queryFn: () => patientApi.getPatients({ page_size: 100 }),
    enabled: isRecordOpen,
  })
  const patients: Patient[] = patientsData?.results || []

  // Fetch Hospitals
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
    enabled: isRecordOpen,
  })

  // Record Payment Mutation
  const recordMutation = useMutation({
    mutationFn: (data: PaymentInput) => billingApi.recordPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-list'] })
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] })
      queryClient.invalidateQueries({ queryKey: ['billing-summary-kpis'] })
      setIsRecordOpen(false)
      setPayAmount('')
      setPayTxnId('')
      setPayNotes('')
    },
  })

  const payments = data?.results || []
  const totalCount = data?.count || 0
  const pageSize = 10
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const columns: Column<Payment>[] = [
    {
      key: 'payment_reference',
      header: 'Payment Ref / Date',
      accessor: (row: Payment) => (
        <div>
          <span className="font-mono font-bold text-slate-900">{row.payment_reference}</span>
          <p className="text-slate-400 text-[11px]">
            {new Date(row.payment_date).toLocaleString([], {
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
      header: 'Patient Account',
      accessor: (row: Payment) => (
        <div>
          <p className="font-medium text-slate-900">{row.patient_name || 'Patient #' + row.patient}</p>
          <span className="font-mono text-[11px] text-slate-500">MRN: {row.patient_mrn}</span>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Payment Method',
      accessor: (row: Payment) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-medium border ${
            paymentMethodBadges[row.payment_method] || 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {row.payment_method_display || row.payment_method}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount Collected',
      accessor: (row: Payment) => (
        <span className="font-mono font-bold text-emerald-700 text-xs">
          {row.currency} {Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'allocated',
      header: 'Allocated to Invoices',
      accessor: (row: Payment) => (
        <div>
          <span className="font-mono text-slate-700 text-xs">
            {row.currency} {Number(row.allocated_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          {Number(row.unallocated_amount || 0) > 0 && (
            <span className="block text-[10px] text-amber-600">
              Unallocated: {row.currency} {Number(row.unallocated_amount).toFixed(2)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'cashier',
      header: 'Received By',
      accessor: (row: Payment) => (
        <div>
          <p className="text-xs text-slate-700 font-medium">{row.received_by_name || 'Cashier'}</p>
          <p className="text-[11px] text-slate-400">{row.hospital_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row: Payment) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          {row.status_display || row.status}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment & Collections Ledger"
        subtitle="Complete chronological transaction record of patient cash receipts, card swipes, UPI, and bank transfers"
        backTo="/billing"
        backLabel="Back to Invoices"
        action={{
          label: 'Record Payment Receipt',
          icon: <Plus className="w-4 h-4 mr-1" />,
          onClick: () => setIsRecordOpen(true),
        }}
      />

      {/* Filter and Search Bar */}
      <FilterBar
        onReset={() => {
          setSearch('')
          setMethodFilter('')
          setPage(1)
        }}
      >
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val)
            setPage(1)
          }}
          placeholder="Search by Payment Ref, MRN, Txn ID..."
          className="w-full sm:w-64"
        />

        <div className="flex items-center space-x-2">
          <label htmlFor="filter-method" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Method:
          </label>
          <select
            id="filter-method"
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value)
              setPage(1)
            }}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="INSURANCE_DIRECT">Insurance Direct</option>
          </select>
        </div>
      </FilterBar>

      {/* Table */}
      <DataTable<Payment>
        columns={columns}
        data={payments}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error ? 'Failed to retrieve payment records' : null}
        emptyMessage="No payment transactions found matching your criteria."
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

      {/* Record Payment Dialog */}
      <ConfirmDialog
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title="Record Direct Patient Payment"
        confirmLabel="Record Receipt"
        isLoading={recordMutation.isPending}
        onConfirm={() => {
          if (payPatientId && payHospitalId && parseFloat(payAmount) > 0) {
            recordMutation.mutate({
              patient: payPatientId,
              hospital: payHospitalId,
              amount: parseFloat(payAmount),
              payment_method: payMethod,
              external_transaction_id: payTxnId || undefined,
              notes: payNotes || undefined,
            })
          }
        }}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Patient Account *
            </label>
            <select
              value={payPatientId || ''}
              onChange={(e) => setPayPatientId(Number(e.target.value))}
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patient_name || p.username} ({p.mrn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receiving Facility *
            </label>
            <select
              value={payHospitalId || ''}
              onChange={(e) => setPayHospitalId(Number(e.target.value))}
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Hospital...</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount ($) *
              </label>
              <input
                type="number"
                step="any"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="INSURANCE_DIRECT">Insurance Direct</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              External Transaction Reference
            </label>
            <input
              type="text"
              value={payTxnId}
              onChange={(e) => setPayTxnId(e.target.value)}
              placeholder="e.g. Card Authorization Code, UPI Reference #..."
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cashier Receipt Notes
            </label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Optional remarks..."
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
export default PaymentListPage
