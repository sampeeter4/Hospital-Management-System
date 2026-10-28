import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Printer,
  CreditCard,
  Send,
  AlertCircle,
} from 'lucide-react'
import { billingApi } from '../../services/api/billingApi'
import {
  Invoice,
  InvoiceStatus,
  InvoiceLineItem,
  PaymentAllocation,
  PaymentMethod,
} from '../../types/billing'
import { PageHeader, ConfirmDialog } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'

const invoiceStatusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ISSUED: 'bg-blue-50 text-blue-700 border-blue-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
  VOID: 'bg-slate-200 text-slate-500 border-slate-300 line-through',
}

export const InvoiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const invoiceId = Number(id)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Collect Payment Modal
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH')
  const [payRef, setPayRef] = useState('')

  // Void Invoice Modal
  const [isVoidOpen, setIsVoidOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  // Fetch Invoice details
  const { data: invoice, isLoading, error } = useQuery<Invoice, Error>({
    queryKey: ['invoice-details', invoiceId],
    queryFn: () => billingApi.getInvoice(invoiceId),
    enabled: !isNaN(invoiceId),
  })

  // Issue Invoice Mutation
  const issueMutation = useMutation({
    mutationFn: () => billingApi.issueInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-details', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] })
    },
  })

  // Void Invoice Mutation
  const voidMutation = useMutation({
    mutationFn: (reason: string) => billingApi.voidInvoice(invoiceId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-details', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] })
      setIsVoidOpen(false)
    },
  })

  // Record Payment Mutation
  const payMutation = useMutation({
    mutationFn: (payload: {
      patient: number
      hospital: number
      amount: number
      payment_method: PaymentMethod
      external_transaction_id?: string
      invoice_id?: number
    }) => billingApi.recordPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-details', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] })
      setIsPayOpen(false)
      setPayAmount('')
      setPayRef('')
    },
  })

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-800">Invoice Record Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          {error?.message || 'The specified billing invoice could not be retrieved.'}
        </p>
        <Link
          to="/billing/invoices"
          className="inline-block mt-4 text-xs text-blue-600 font-medium hover:underline"
        >
          Return to Invoices
        </Link>
      </div>
    )
  }

  const isStaff = user?.role !== 'PATIENT'
  const balance = Number(invoice.balance_due)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header (Hidden on Print) */}
      <div className="print:hidden">
        <PageHeader
          title={`Invoice: ${invoice.invoice_number}`}
          subtitle={`Issued for patient ${invoice.patient_name} (${invoice.patient_mrn})`}
          backTo="/billing/invoices"
          backLabel="Back to Invoices"
        >
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Print / PDF
            </button>

            {invoice.status === 'DRAFT' && isStaff && (
              <button
                type="button"
                disabled={issueMutation.isPending}
                onClick={() => issueMutation.mutate()}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {issueMutation.isPending ? 'Issuing...' : 'Issue Invoice'}
              </button>
            )}

            {balance > 0 && invoice.status !== 'VOID' && isStaff && (
              <button
                type="button"
                onClick={() => {
                  setPayAmount(String(invoice.balance_due))
                  setIsPayOpen(true)
                }}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors shadow-sm"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                Collect Payment
              </button>
            )}

            {invoice.status !== 'VOID' && invoice.status !== 'PAID' && isStaff && (
              <button
                type="button"
                onClick={() => setIsVoidOpen(true)}
                className="inline-flex items-center px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors"
              >
                Void
              </button>
            )}
          </div>
        </PageHeader>
      </div>

      {/* Printable Invoice Document Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 print:border-none print:shadow-none print:p-0">
        {/* Invoice Letterhead */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-7 h-7 rounded bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                HMS
              </span>
              <h2 className="text-base font-bold text-slate-900">{invoice.hospital_name}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Hospital Patient Healthcare Invoicing & Accounts</p>
          </div>

          <div className="sm:text-right">
            <span className="font-mono text-xl font-extrabold text-slate-900 block">
              {invoice.invoice_number}
            </span>
            <div className="mt-1">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  invoiceStatusColors[invoice.status] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {invoice.status_display || invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* Billed To / Terms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Billed To Patient
            </span>
            <h3 className="text-sm font-bold text-slate-900">{invoice.patient_name || 'Patient #' + invoice.patient}</h3>
            <p className="text-slate-600 font-mono mt-0.5">Medical Record # (MRN): {invoice.patient_mrn}</p>
            {invoice.admission_reference && (
              <p className="text-slate-500 mt-0.5">Inpatient Admission: {invoice.admission_reference}</p>
            )}
            {invoice.appointment_reference && (
              <p className="text-slate-500 mt-0.5">Appointment: {invoice.appointment_reference}</p>
            )}
          </div>

          <div className="sm:text-right space-y-1">
            <div>
              <span className="text-slate-500 mr-2">Invoice Date:</span>
              <span className="font-semibold text-slate-800">
                {new Date(invoice.invoice_date).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-2">Payment Due Date:</span>
              <span className="font-semibold text-slate-800">
                {new Date(invoice.due_date).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            {invoice.issued_by_name && (
              <div>
                <span className="text-slate-500 mr-2">Authorized By:</span>
                <span className="text-slate-700">{invoice.issued_by_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Code</th>
                <th className="px-4 py-2.5 text-left font-semibold">Service Description</th>
                <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                <th className="px-4 py-2.5 text-right font-semibold">Unit Price</th>
                <th className="px-4 py-2.5 text-right font-semibold">Discount</th>
                <th className="px-4 py-2.5 text-right font-semibold">Tax</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.line_items?.map((item: InvoiceLineItem) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono font-medium text-slate-700">{item.service_code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{Number(item.quantity)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">
                    {invoice.currency} {Number(item.unit_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">
                    {Number(item.discount) > 0 ? `-${Number(item.discount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">
                    {Number(item.tax_amount) > 0 ? `${Number(item.tax_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {invoice.currency} {Number(item.total_amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mt-6 pt-4 border-t border-slate-100 text-xs">
          <div className="max-w-xs text-slate-500">
            {invoice.notes && (
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Billing Notes & Terms:</span>
                <p>{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">{invoice.currency} {Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {Number(invoice.total_discount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Total Discounts:</span>
                <span className="font-mono">-{invoice.currency} {Number(invoice.total_discount).toFixed(2)}</span>
              </div>
            )}
            {Number(invoice.total_tax) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Sales Tax / VAT:</span>
                <span className="font-mono">+{invoice.currency} {Number(invoice.total_tax).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="font-mono">{invoice.currency} {Number(invoice.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Amount Paid:</span>
              <span className="font-mono">{invoice.currency} {Number(invoice.paid_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
              <span>Net Balance Due:</span>
              <span className="font-mono">{invoice.currency} {Number(invoice.balance_due).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Applied Payments / Allocations */}
        {invoice.allocations && invoice.allocations.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Payment Receipts Applied ({invoice.allocations.length})
            </h4>

            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Allocation #</th>
                    <th className="px-3 py-2 text-left font-medium">Allocated Date</th>
                    <th className="px-3 py-2 text-right font-medium">Amount Credited</th>
                    <th className="px-3 py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {invoice.allocations.map((alloc: PaymentAllocation) => (
                    <tr key={alloc.id}>
                      <td className="px-3 py-2 text-slate-800">#{alloc.id}</td>
                      <td className="px-3 py-2 text-slate-600 font-sans">
                        {new Date(alloc.allocated_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">
                        {invoice.currency} {Number(alloc.amount).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-sans">
                        {alloc.is_reversed ? (
                          <span className="text-rose-600 font-medium">Reversed</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Applied</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Collect Payment Dialog */}
      <ConfirmDialog
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title={`Record Payment for ${invoice.invoice_number}`}
        confirmLabel="Record Payment"
        isLoading={payMutation.isPending}
        onConfirm={() => {
          if (parseFloat(payAmount) > 0) {
            payMutation.mutate({
              patient: invoice.patient,
              hospital: invoice.hospital,
              amount: parseFloat(payAmount),
              payment_method: payMethod,
              external_transaction_id: payRef || undefined,
              invoice_id: invoice.id,
            })
          }
        }}
      >
        <div className="space-y-3">
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs">
            <p className="font-semibold text-slate-900">{invoice.patient_name} ({invoice.patient_mrn})</p>
            <p className="text-slate-500 mt-0.5">
              Outstanding Balance: <strong className="font-mono text-slate-800">{invoice.currency} {invoice.balance_due}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount ({invoice.currency}) *
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
              External Transaction Ref
            </label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. Card Auth Code, UPI Txn ID..."
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </ConfirmDialog>

      {/* Void Invoice Dialog */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        title="Void Billing Invoice"
        confirmLabel="Void Invoice"
        isDestructive
        isLoading={voidMutation.isPending}
        onConfirm={() => {
          if (voidReason.trim()) {
            voidMutation.mutate(voidReason.trim())
          }
        }}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Specify justification for voiding invoice {invoice.invoice_number}:
          </p>
          <textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="e.g. Billing error, service cancelled, duplicate invoice..."
            rows={3}
            className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
export default InvoiceDetailsPage
