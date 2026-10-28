import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Receipt,
  Shield,
} from 'lucide-react'
import { billingApi } from '../../services/api/billingApi'
import {
  Invoice,
  InvoiceStatus,
  FinancialSummaryReport,
  PaymentMethod,
} from '../../types/billing'
import {
  PageHeader,
  DataTable,
  Column,
  FilterBar,
  SearchInput,
  Pagination,
  ConfirmDialog,
} from '../../components/ui'

const invoiceStatusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ISSUED: 'bg-blue-50 text-blue-700 border-blue-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
  VOID: 'bg-slate-200 text-slate-500 border-slate-300 line-through',
}

export const InvoiceListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Quick Payment Modal state
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH')
  const [payRef, setPayRef] = useState('')

  // Fetch Invoices
  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices-list', { page, search, status: statusFilter }],
    queryFn: () =>
      billingApi.getInvoices({
        page,
        search: search || undefined,
        status: (statusFilter as InvoiceStatus) || undefined,
      }),
  })

  // Fetch Financial KPI Summary
  const { data: summary } = useQuery<FinancialSummaryReport>({
    queryKey: ['billing-summary-kpis'],
    queryFn: () => billingApi.getFinancialSummary(),
  })

  // Record Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: (payload: {
      patient: number
      hospital: number
      amount: number
      payment_method: PaymentMethod
      external_transaction_id?: string
      invoice_id?: number
    }) => billingApi.recordPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] })
      queryClient.invalidateQueries({ queryKey: ['billing-summary-kpis'] })
      setPayInvoice(null)
      setPayAmount('')
      setPayRef('')
    },
  })

  const invoices = data?.results || []
  const totalCount = data?.count || 0
  const pageSize = 10
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const columns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice # / Date',
      accessor: (row: Invoice) => (
        <div>
          <span className="font-mono font-bold text-slate-900">{row.invoice_number}</span>
          <p className="text-slate-400 text-[11px]">
            {new Date(row.invoice_date).toLocaleDateString([], {
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
      header: 'Patient Account',
      accessor: (row: Invoice) => (
        <div>
          <p className="font-medium text-slate-900">{row.patient_name || 'Patient #' + row.patient}</p>
          <span className="font-mono text-[11px] text-slate-500">MRN: {row.patient_mrn}</span>
        </div>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      accessor: (row: Invoice) => {
        const isOverdue =
          new Date(row.due_date) < new Date() && Number(row.balance_due) > 0 && row.status !== 'VOID'
        return (
          <div>
            <span className={`text-xs ${isOverdue ? 'font-bold text-rose-600' : 'text-slate-700'}`}>
              {new Date(row.due_date).toLocaleDateString()}
            </span>
            {isOverdue && <span className="block text-[10px] text-rose-500 font-semibold">Overdue</span>}
          </div>
        )
      },
    },
    {
      key: 'total',
      header: 'Total Billed',
      accessor: (row: Invoice) => (
        <span className="font-mono font-semibold text-slate-900">
          {row.currency} {Number(row.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'paid',
      header: 'Paid Amount',
      accessor: (row: Invoice) => (
        <span className="font-mono text-emerald-700 font-medium">
          {row.currency} {Number(row.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance Due',
      accessor: (row: Invoice) => {
        const balance = Number(row.balance_due)
        return (
          <span
            className={`font-mono font-bold ${
              balance > 0 ? 'text-amber-700' : 'text-slate-400'
            }`}
          >
            {row.currency} {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row: Invoice) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
            invoiceStatusColors[row.status] || 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          {row.status_display || row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (row: Invoice) => (
        <div className="flex items-center space-x-2">
          <Link
            to={`/billing/invoices/${row.id}`}
            className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          >
            Details
          </Link>
          {Number(row.balance_due) > 0 && row.status !== 'VOID' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPayInvoice(row)
                setPayAmount(String(row.balance_due))
              }}
              className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors border border-emerald-200"
            >
              Collect
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing, Invoicing & Patient Accounting"
        subtitle="Manage hospital patient invoices, fee collections, payment receipts, and insurance claims"
        action={{
          label: 'Create Invoice',
          icon: <Plus className="w-4 h-4 mr-1" />,
          onClick: () => navigate('/billing/invoices/new'),
        }}
      >
        <div className="flex items-center space-x-2">
          <Link
            to="/billing/payments"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Receipt className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Payment Ledger
          </Link>
          <Link
            to="/billing/insurance"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Shield className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Insurance Claims
          </Link>
        </div>
      </PageHeader>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Invoiced
          </span>
          <span className="text-2xl font-bold text-slate-900 font-mono">
            ${Number(summary?.total_invoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block mb-1">
            Collections Realized
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-emerald-700 font-mono">
              ${Number(summary?.total_collected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              ({summary?.collection_rate_percent ?? 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block mb-1">
            Outstanding Receivables
          </span>
          <span className="text-2xl font-bold text-amber-700 font-mono">
            ${Number(summary?.total_outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Discounts & Relief
          </span>
          <span className="text-2xl font-bold text-slate-700 font-mono">
            ${Number(summary?.total_discounted || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <FilterBar
        onReset={() => {
          setSearch('')
          setStatusFilter('')
          setPage(1)
        }}
      >
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val)
            setPage(1)
          }}
          placeholder="Search by Invoice #, MRN, patient..."
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
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOID">Void</option>
          </select>
        </div>
      </FilterBar>

      {/* Table */}
      <DataTable<Invoice>
        columns={columns}
        data={invoices}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error ? 'Failed to retrieve invoice ledger' : null}
        emptyMessage="No patient invoices found matching your criteria."
        onRowClick={(row: Invoice) => navigate(`/billing/invoices/${row.id}`)}
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

      {/* Quick Collect Payment Modal */}
      <ConfirmDialog
        isOpen={payInvoice !== null}
        onClose={() => setPayInvoice(null)}
        title={`Collect Payment: ${payInvoice?.invoice_number}`}
        confirmLabel="Record Receipt & Settle"
        isLoading={paymentMutation.isPending}
        onConfirm={() => {
          if (payInvoice && parseFloat(payAmount) > 0) {
            paymentMutation.mutate({
              patient: payInvoice.patient,
              hospital: payInvoice.hospital,
              amount: parseFloat(payAmount),
              payment_method: payMethod,
              external_transaction_id: payRef || undefined,
              invoice_id: payInvoice.id,
            })
          }
        }}
      >
        <div className="space-y-3">
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs">
            <p className="font-semibold text-slate-900">{payInvoice?.patient_name} ({payInvoice?.patient_mrn})</p>
            <p className="text-slate-500 mt-0.5">
              Current Balance: <strong className="font-mono text-slate-800">{payInvoice?.currency} {payInvoice?.balance_due}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount ({payInvoice?.currency || 'USD'}) *
            </label>
            <input
              type="number"
              step="any"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
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
              <option value="UPI">UPI / Instant Transfer</option>
              <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
              <option value="CHEQUE">Cheque</option>
              <option value="INSURANCE_DIRECT">Direct Insurance Claim Payment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction / Check / Authorization Ref
            </label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. POS Auth #, UPI Ref, Cheque #"
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
export default InvoiceListPage
