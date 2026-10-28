import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  FileText,
  Barcode,
  FlaskConical,
  Check,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { laboratoryApi } from '../../services/api/laboratoryApi'
import {
  LabOrder,
  LabOrderItem,
  LabSpecimen,
  LabOrderStatus,
  LabOrderPriority,
  LabResult,
} from '../../types/laboratory'
import { PageHeader, DetailField, ConfirmDialog } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'

const statusColors: Record<LabOrderStatus, string> = {
  ORDERED: 'bg-blue-50 text-blue-700 border-blue-200',
  COLLECTED: 'bg-amber-50 text-amber-700 border-amber-200',
  PROCESSING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
}

const priorityStyles: Record<LabOrderPriority, string> = {
  ROUTINE: 'bg-slate-100 text-slate-700 border-slate-200',
  URGENT: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
  STAT: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
}

export const LabOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const orderId = Number(id)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // State for Specimen actions
  const [collectSpecimenId, setCollectSpecimenId] = useState<number | null>(null)
  const [collectionLocation, setCollectionLocation] = useState('Phlebotomy Room 1')

  const [rejectSpecimenId, setRejectSpecimenId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // State for Order Cancellation
  const [isCancelOrderOpen, setIsCancelOrderOpen] = useState(false)
  const [orderCancelReason, setOrderCancelReason] = useState('')

  // Fetch Order details
  const { data: order, isLoading, error } = useQuery<LabOrder, Error>({
    queryKey: ['lab-order', orderId],
    queryFn: () => laboratoryApi.getLabOrder(orderId),
    enabled: !isNaN(orderId),
  })

  // Fetch Order Specimen list
  const { data: specimensData } = useQuery({
    queryKey: ['lab-specimens', { order: orderId }],
    queryFn: () => laboratoryApi.getLabSpecimens({ search: order?.order_reference }),
    enabled: Boolean(order?.order_reference),
  })
  const specimens: LabSpecimen[] = specimensData?.results || order?.specimens || []

  // Fetch Order Results
  const { data: resultsData } = useQuery({
    queryKey: ['lab-results', { orderRef: order?.order_reference }],
    queryFn: () => laboratoryApi.getLabResults({ search: order?.order_reference }),
    enabled: Boolean(order?.order_reference),
  })
  const results: LabResult[] = resultsData?.results || []

  // Mutations
  const collectMutation = useMutation({
    mutationFn: ({ specimenId, location }: { specimenId: number; location: string }) =>
      laboratoryApi.collectSpecimen(specimenId, location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['lab-specimens'] })
      setCollectSpecimenId(null)
    },
  })

  const receiveMutation = useMutation({
    mutationFn: (specimenId: number) => laboratoryApi.receiveSpecimen(specimenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['lab-specimens'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ specimenId, reason }: { specimenId: number; reason: string }) =>
      laboratoryApi.rejectSpecimen(specimenId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['lab-specimens'] })
      setRejectSpecimenId(null)
      setRejectionReason('')
    },
  })

  const cancelOrderMutation = useMutation({
    mutationFn: (reason: string) => laboratoryApi.cancelLabOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      setIsCancelOrderOpen(false)
    },
  })

  const verifyResultMutation = useMutation({
    mutationFn: (resultId: number) => laboratoryApi.verifyLabResult(resultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['lab-results'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-800">Order Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          {error?.message || 'The requested laboratory order could not be located.'}
        </p>
        <Link
          to="/laboratory"
          className="inline-block mt-4 text-xs text-blue-600 font-medium hover:underline"
        >
          Return to Laboratory Orders
        </Link>
      </div>
    )
  }

  const isStaff = user?.role !== 'PATIENT'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={`Lab Order: ${order.order_reference}`}
        subtitle={`Requisitioned on ${new Date(order.ordered_at).toLocaleDateString([], {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`}
        backTo="/laboratory"
        backLabel="Back to Lab Orders"
      >
        <div className="flex items-center space-x-2">
          {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && isStaff && (
            <button
              type="button"
              onClick={() => setIsCancelOrderOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-md hover:bg-rose-50 transition-colors"
            >
              Cancel Order
            </button>
          )}
        </div>
      </PageHeader>

      {/* Primary Order Summary Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                statusColors[order.status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {order.status_display || order.status}
            </span>
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-xs border ${
                priorityStyles[order.priority] || priorityStyles.ROUTINE
              }`}
            >
              Priority: {order.priority_display || order.priority}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Ordered by: <span className="font-medium text-slate-700">{order.ordered_by_name || 'System'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <DetailField
            label="Patient Information"
            value={
              <div>
                <p className="font-semibold text-slate-800">{order.patient_name || 'Patient #' + order.patient}</p>
                <p className="text-[11px] text-slate-500">MRN: {order.patient_mrn}</p>
              </div>
            }
          />
          <DetailField
            label="Ordering Physician"
            value={
              <div>
                <p className="font-medium text-slate-800">{order.doctor_name || 'Physician #' + order.ordering_doctor}</p>
                <p className="text-[11px] text-slate-500">{order.department_name || 'Clinical Dept'}</p>
              </div>
            }
          />
          <DetailField
            label="Hospital Facility"
            value={<p className="text-slate-700">{order.hospital_name}</p>}
          />
          <DetailField
            label="Order Reference"
            value={<span className="font-mono text-xs font-medium text-slate-800">{order.order_reference}</span>}
          />
        </div>

        {/* Clinical Notes */}
        {(order.clinical_indication || order.clinical_notes) && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
            {order.clinical_indication && (
              <p className="text-slate-700">
                <span className="font-semibold text-slate-900">Clinical Indication: </span>
                {order.clinical_indication}
              </p>
            )}
            {order.clinical_notes && (
              <p className="text-slate-600 mt-1">
                <span className="font-semibold text-slate-900">Clinical Notes: </span>
                {order.clinical_notes}
              </p>
            )}
          </div>
        )}

        {order.cancellation_reason && (
          <div className="mt-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <span className="font-semibold">Cancellation Reason: </span>
            {order.cancellation_reason}
          </div>
        )}
      </div>

      {/* Ordered Laboratory Tests */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center">
            <FlaskConical className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Ordered Investigations ({order.items?.length || 0})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Test Code</th>
                <th className="px-4 py-2.5 text-left font-medium">Diagnostic Test</th>
                <th className="px-4 py-2.5 text-left font-medium">Specimen Matrix</th>
                <th className="px-4 py-2.5 text-left font-medium">Item Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Workstation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item: LabOrderItem) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono font-medium text-slate-700">{item.test_code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.test_name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.specimen_type || 'General'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {item.status_display || item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.has_result ? (
                      <span className="inline-flex items-center text-emerald-600 font-medium">
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Result Entered
                      </span>
                    ) : order.status !== 'CANCELLED' && isStaff ? (
                      <Link
                        to={`/laboratory/results/enter?orderItemId=${item.id}&testName=${encodeURIComponent(
                          item.test_name
                        )}`}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                      >
                        Enter Results
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    ) : (
                      <span className="text-slate-400">Pending sample</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Specimen Accessioning & Collection Workflow */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center">
            <Barcode className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Specimens & Accessioning ({specimens.length})
          </h3>
        </div>

        {specimens.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No specimen containers registered for this order.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {specimens.map((spec: LabSpecimen) => (
              <div key={spec.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-800 text-xs px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                      {spec.barcode}
                    </span>
                    <span className="text-xs font-medium text-slate-700">{spec.specimen_type}</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                        spec.status === 'COLLECTED'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : spec.status === 'RECEIVED'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : spec.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : spec.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {spec.status_display || spec.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {spec.collected_at ? (
                      <>
                        Collected by {spec.collected_by_name || 'Staff'} at{' '}
                        {new Date(spec.collected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                        ({spec.collection_location || 'Collection Site'})
                      </>
                    ) : (
                      'Pending specimen phlebotomy / collection'
                    )}
                    {spec.received_at && (
                      <span className="ml-2 font-medium text-slate-700">
                        • Received in Lab: {new Date(spec.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {spec.rejection_reason && (
                      <span className="ml-2 text-rose-600 font-medium">
                        • Rejected: {spec.rejection_reason}
                      </span>
                    )}
                  </p>
                </div>

                {isStaff && spec.status !== 'COMPLETED' && spec.status !== 'REJECTED' && (
                  <div className="flex items-center space-x-2">
                    {spec.status === 'PENDING_COLLECTION' && (
                      <button
                        type="button"
                        onClick={() => setCollectSpecimenId(spec.id)}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                      >
                        Collect Sample
                      </button>
                    )}

                    {spec.status === 'COLLECTED' && (
                      <button
                        type="button"
                        disabled={receiveMutation.isPending}
                        onClick={() => receiveMutation.mutate(spec.id)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                      >
                        Receive at Bench
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setRejectSpecimenId(spec.id)}
                      className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diagnostic Results Section */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Diagnostic Laboratory Results ({results.length})
            </h3>
          </div>

          <div className="divide-y divide-slate-200">
            {results.map((res: LabResult) => (
              <div key={res.id} className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {res.test_name} ({res.test_code})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Result Ref: <span className="font-mono">{res.result_reference}</span> • Specimen: {res.specimen_barcode || 'N/A'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        res.status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : res.status === 'CORRECTED'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {res.status_display || res.status}
                    </span>

                    {res.is_critical && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                        CRITICAL ALERT
                      </span>
                    )}

                    {res.status === 'PRELIMINARY' && isStaff && (
                      <button
                        type="button"
                        disabled={verifyResultMutation.isPending}
                        onClick={() => verifyResultMutation.mutate(res.id)}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Verify & Release
                      </button>
                    )}
                  </div>
                </div>

                {/* Parameters Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Parameter / Analyte</th>
                        <th className="px-3 py-2 text-left font-medium">Measured Value</th>
                        <th className="px-3 py-2 text-left font-medium">Unit</th>
                        <th className="px-3 py-2 text-left font-medium">Reference Interval</th>
                        <th className="px-3 py-2 text-left font-medium">Flag / Evaluation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {res.parameter_values?.map((pv) => (
                        <tr
                          key={pv.id}
                          className={pv.is_critical ? 'bg-rose-50/50' : pv.abnormality_flag !== 'NORMAL' ? 'bg-amber-50/30' : ''}
                        >
                          <td className="px-3 py-2 font-medium text-slate-900">{pv.parameter_name}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-900">
                            {pv.numeric_value !== null && pv.numeric_value !== undefined
                              ? pv.numeric_value
                              : pv.text_value || '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{pv.unit || '—'}</td>
                          <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                            {pv.reference_range_display || 'Standard'}
                          </td>
                          <td className="px-3 py-2">
                            {pv.abnormality_flag === 'NORMAL' ? (
                              <span className="text-emerald-700 font-medium">Normal</span>
                            ) : pv.is_critical ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                {pv.abnormality_display || 'CRITICAL'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                {pv.abnormality_display || 'Abnormal'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Overall interpretation & Verification details */}
                <div className="bg-slate-50 rounded-md p-3 text-xs space-y-1.5 border border-slate-200">
                  {res.overall_interpretation && (
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900">Diagnostic Interpretation: </span>
                      {res.overall_interpretation}
                    </p>
                  )}
                  {res.clinical_comments && (
                    <p className="text-slate-600">
                      <span className="font-semibold text-slate-900">Lab Comments: </span>
                      {res.clinical_comments}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200 mt-2">
                    <span>
                      Entered by: <strong className="text-slate-700">{res.entered_by_name || 'Staff'}</strong>
                      {res.entered_at && ` on ${new Date(res.entered_at).toLocaleString()}`}
                    </span>
                    {res.verified_by_name && (
                      <span>
                        Verified by: <strong className="text-slate-700">{res.verified_by_name}</strong>
                        {res.verified_at && ` on ${new Date(res.verified_at).toLocaleString()}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collect Specimen Dialog */}
      <ConfirmDialog
        isOpen={collectSpecimenId !== null}
        onClose={() => setCollectSpecimenId(null)}
        title="Collect Diagnostic Specimen"
        confirmLabel="Confirm Collection"
        isLoading={collectMutation.isPending}
        onConfirm={() => {
          if (collectSpecimenId) {
            collectMutation.mutate({
              specimenId: collectSpecimenId,
              location: collectionLocation,
            })
          }
        }}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Record phlebotomy or sample collection location for this accessioned specimen:
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Collection Site / Station
            </label>
            <input
              type="text"
              value={collectionLocation}
              onChange={(e) => setCollectionLocation(e.target.value)}
              placeholder="e.g. Phlebotomy Station 2, Ward 3 Bed 12"
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </ConfirmDialog>

      {/* Reject Specimen Dialog */}
      <ConfirmDialog
        isOpen={rejectSpecimenId !== null}
        onClose={() => setRejectSpecimenId(null)}
        title="Reject Specimen Sample"
        confirmLabel="Reject Sample"
        isDestructive
        isLoading={rejectMutation.isPending}
        onConfirm={() => {
          if (rejectSpecimenId && rejectionReason.trim()) {
            rejectMutation.mutate({
              specimenId: rejectSpecimenId,
              reason: rejectionReason.trim(),
            })
          }
        }}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Please indicate the pre-analytical rejection criteria:
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Hemolyzed blood sample, clotted EDTA tube, insufficient sample quantity..."
            rows={3}
            className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </ConfirmDialog>

      {/* Cancel Order Dialog */}
      <ConfirmDialog
        isOpen={isCancelOrderOpen}
        onClose={() => setIsCancelOrderOpen(false)}
        title="Cancel Laboratory Requisition"
        confirmLabel="Cancel Requisition"
        isDestructive
        isLoading={cancelOrderMutation.isPending}
        onConfirm={() => {
          if (orderCancelReason.trim()) {
            cancelOrderMutation.mutate(orderCancelReason.trim())
          }
        }}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Specify clinical reason for cancelling order {order.order_reference}:
          </p>
          <textarea
            value={orderCancelReason}
            onChange={(e) => setOrderCancelReason(e.target.value)}
            placeholder="Clinical justification for cancelling test order..."
            rows={3}
            className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
export default LabOrderDetailsPage
