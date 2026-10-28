import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  AlertCircle,
  Clock,
  FileSpreadsheet,
} from 'lucide-react'
import { laboratoryApi } from '../../services/api/laboratoryApi'
import { LabOrder, LabOrderStatus, LabOrderPriority } from '../../types/laboratory'
import {
  PageHeader,
  DataTable,
  Column,
  FilterBar,
  SearchInput,
  Pagination,
  ConfirmDialog,
} from '../../components/ui'

const statusColors: Record<LabOrderStatus, string> = {
  ORDERED: 'bg-blue-50 text-blue-700 border-blue-200',
  COLLECTED: 'bg-amber-50 text-amber-700 border-amber-200',
  PROCESSING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
}

const priorityStyles: Record<LabOrderPriority, { badge: string; icon?: React.ReactNode }> = {
  ROUTINE: { badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  URGENT: {
    badge: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    icon: <Clock className="w-3 h-3 mr-1 inline" />,
  },
  STAT: {
    badge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
    icon: <AlertCircle className="w-3 h-3 mr-1 inline" />,
  },
}

export const LabOrderListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['lab-orders', { page, search, status: statusFilter, priority: priorityFilter }],
    queryFn: () =>
      laboratoryApi.getLabOrders({
        page,
        search: search || undefined,
        status: (statusFilter as LabOrderStatus) || undefined,
        priority: (priorityFilter as LabOrderPriority) || undefined,
      }),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      laboratoryApi.cancelLabOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      setCancelOrderId(null)
      setCancelReason('')
    },
  })

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value)
    setPage(1)
  }

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPriorityFilter(e.target.value)
    setPage(1)
  }

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPriorityFilter('')
    setPage(1)
  }

  const orders = data?.results || []
  const totalCount = data?.count || 0
  const pageSize = 10
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const columns: Column<LabOrder>[] = [
    {
      key: 'order_reference',
      header: 'Order Ref / Date',
      accessor: (row: LabOrder) => (
        <div>
          <span className="font-mono font-semibold text-slate-800">{row.order_reference}</span>
          <p className="text-slate-400 text-[11px]">
            {new Date(row.ordered_at).toLocaleString([], {
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
      header: 'Patient',
      accessor: (row: LabOrder) => (
        <div>
          <p className="font-medium text-slate-800">{row.patient_name || 'Patient #' + row.patient}</p>
          <span className="font-mono text-[11px] text-slate-500">MRN: {row.patient_mrn}</span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      accessor: (row: LabOrder) => {
        const pStyle = priorityStyles[row.priority] || priorityStyles.ROUTINE
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border ${pStyle.badge}`}>
            {pStyle.icon}
            {row.priority_display || row.priority}
          </span>
        )
      },
    },
    {
      key: 'items',
      header: 'Tests Ordered',
      accessor: (row: LabOrder) => (
        <div className="max-w-xs">
          <p className="text-xs text-slate-700 truncate font-medium">
            {row.items?.map((i) => i.test_name).join(', ') || 'No tests specified'}
          </p>
          <span className="text-[11px] text-slate-400">
            {row.items?.length || 0} investigation{row.items?.length === 1 ? '' : 's'}
          </span>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Physician / Facility',
      accessor: (row: LabOrder) => (
        <div>
          <p className="text-xs text-slate-700 font-medium">{row.doctor_name || 'Attending Physician'}</p>
          <p className="text-[11px] text-slate-400">{row.hospital_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row: LabOrder) => (
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
      accessor: (row: LabOrder) => (
        <div className="flex items-center space-x-2">
          <Link
            to={`/laboratory/orders/${row.id}`}
            className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          >
            Review
          </Link>
          {row.status !== 'CANCELLED' && row.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setCancelOrderId(row.id)
              }}
              className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Laboratory & Diagnostics"
        subtitle="Manage laboratory orders, specimen accessioning, and diagnostic results"
        action={{
          label: 'Order Lab Tests',
          icon: <Plus className="w-4 h-4 mr-1" />,
          onClick: () => navigate('/laboratory/orders/new'),
        }}
      >
        <div className="flex items-center space-x-2">
          <Link
            to="/laboratory/catalogue"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Test Catalogue
          </Link>
        </div>
      </PageHeader>

      {/* Filter and Search Bar */}
      <FilterBar onReset={handleResetFilters}>
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by Order #, MRN, patient..."
          className="w-full sm:w-64"
        />

        <div className="flex items-center space-x-2">
          <label htmlFor="filter-status" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Status:
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={handleStatusChange}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ORDERED">Ordered</option>
            <option value="COLLECTED">Collected</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="filter-priority" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Priority:
          </label>
          <select
            id="filter-priority"
            value={priorityFilter}
            onChange={handlePriorityChange}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
            <option value="STAT">STAT (Immediate)</option>
          </select>
        </div>
      </FilterBar>

      {/* Main Table */}
      <DataTable<LabOrder>
        columns={columns}
        data={orders}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error ? 'Failed to retrieve laboratory orders' : null}
        emptyMessage="No laboratory test orders found matching your criteria."
        onRowClick={(row: LabOrder) => navigate(`/laboratory/orders/${row.id}`)}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Cancel Order Dialog */}
      <ConfirmDialog
        isOpen={cancelOrderId !== null}
        onClose={() => setCancelOrderId(null)}
        title="Cancel Laboratory Order"
        confirmLabel="Confirm Cancellation"
        isDestructive
        isLoading={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelOrderId && cancelReason.trim()) {
            cancelMutation.mutate({ id: cancelOrderId, reason: cancelReason.trim() })
          }
        }}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Please provide a clinical justification for cancelling this laboratory order:
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (e.g. Duplicate order, Patient declined, Physician order change)..."
            rows={3}
            className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
export default LabOrderListPage
