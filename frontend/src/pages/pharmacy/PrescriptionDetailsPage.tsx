import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Pill,
  Send,
  XCircle,
  User,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { pharmacyApi } from '../../services/api/pharmacyApi'
import {
  Prescription,
  PrescriptionStatus,
} from '../../types/pharmacy'
import { PageHeader, ConfirmDialog } from '../../components/ui'

const STATUS_BADGES: Record<PrescriptionStatus, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  ISSUED: { label: 'Issued / Pending Dispense', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  PARTIALLY_DISPENSED: { label: 'Partially Dispensed', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  DISPENSED: { label: 'Fully Dispensed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
}

export const PrescriptionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Fetch Prescription
  const { data: prescription, isLoading, isError, error } = useQuery<Prescription, Error>({
    queryKey: ['prescription', id],
    queryFn: () => pharmacyApi.getPrescription(id!),
    enabled: !!id,
  })

  // Issue mutation
  const issueMutation = useMutation({
    mutationFn: () => pharmacyApi.issuePrescription(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription', id] })
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (reason: string) => pharmacyApi.cancelPrescription(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription', id] })
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      setIsCancelOpen(false)
      setCancelReason('')
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 animate-pulse p-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-32 bg-slate-100 rounded-lg" />
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  if (isError || !prescription) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load prescription: {error?.message || 'Prescription not found'}
        </div>
        <button
          onClick={() => navigate('/pharmacy/prescriptions')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
        >
          Back to Prescriptions
        </button>
      </div>
    )
  }

  const badge = STATUS_BADGES[prescription.status] || STATUS_BADGES.DRAFT
  const isTerminal = ['DISPENSED', 'CANCELLED'].includes(prescription.status)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={`Prescription ${prescription.prescription_reference}`}
        subtitle={`Prescribed on ${new Date(prescription.prescribed_date).toLocaleDateString()} by Dr. ${prescription.doctor_name || prescription.doctor}`}
        backTo="/pharmacy/prescriptions"
        backLabel="Back to Prescriptions"
        actions={
          <div className="flex items-center gap-2">
            {prescription.status === 'DRAFT' && (
              <button
                onClick={() => issueMutation.mutate()}
                disabled={issueMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Issue to Pharmacy
              </button>
            )}

            {!isTerminal && (
              <button
                onClick={() => setIsCancelOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Prescription
              </button>
            )}
          </div>
        }
      />

      {/* Prescription Information Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900">
                {prescription.prescription_reference}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {badge.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
              <span>Patient: <strong>{prescription.patient_name || `Patient #${prescription.patient}`}</strong></span>
              <span>•</span>
              <span className="font-mono">MRN: {prescription.patient_mrn}</span>
              <span>•</span>
              <span>Doctor: <strong>Dr. {prescription.doctor_name}</strong></span>
              <span>•</span>
              <span>Facility: {prescription.hospital_name || 'Central Hospital'}</span>
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={() => navigate(`/patients/${prescription.patient}`)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              Open Patient EHR →
            </button>
          </div>
        </div>

        {prescription.cancellation_reason && (
          <div className="mt-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              Cancelled Prescription:
            </div>
            <p className="mt-1 pl-5">{prescription.cancellation_reason}</p>
          </div>
        )}
      </div>

      {/* Prescribed Items Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Pill className="w-4 h-4 text-blue-600" />
          Medications & Dispensing Instructions
        </h3>

        {!prescription.items || prescription.items.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No medications attached to this prescription.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase">
                  <th className="py-2.5 px-3">Medication</th>
                  <th className="py-2.5 px-3">Dosage</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3 text-center">Prescribed / Dispensed</th>
                  <th className="py-2.5 px-3">Patient Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prescription.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {item.medicine_name || `Medicine #${item.medicine}`}
                      </div>
                      {item.allergy_warning && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{item.allergy_warning}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">{item.dosage_instructions}</td>
                    <td className="py-3 px-3">{item.frequency}</td>
                    <td className="py-3 px-3 font-mono">
                      {item.duration_value} {item.duration_unit?.toLowerCase()}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium">
                      <span className="text-blue-700 font-bold">{item.quantity_prescribed}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-emerald-700 font-bold">{item.quantity_dispensed || 0}</span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        {item.dispensing_unit || 'units'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {item.patient_instructions || 'Take as directed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clinical Notes & General Directions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          Clinical Indication & Pharmacy Directions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Clinical Indication / Diagnosis
            </span>
            <p className="text-slate-800 mt-1">
              {prescription.clinical_indication || 'Standard outpatient prescription'}
            </p>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              General Pharmacy Directions
            </span>
            <p className="text-slate-800 mt-1">
              {prescription.general_instructions || 'None recorded.'}
            </p>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {isCancelOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Cancel Prescription"
          description="Are you sure you want to cancel this prescription? This will prevent any further dispensing."
          confirmLabel={cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
          cancelLabel="Back"
          variant="danger"
          onCancel={() => setIsCancelOpen(false)}
          onConfirm={() => {
            if (cancelReason.trim()) {
              cancelMutation.mutate(cancelReason)
            }
          }}
        >
          <div className="mt-3">
            <label htmlFor="cancel-rx-reason" className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Cancellation Reason *
            </label>
            <textarea
              id="cancel-rx-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Dosage altered, medication discontinued, adverse reaction observed..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}

export default PrescriptionDetailsPage

