import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bed as BedIcon,
  AlertCircle,
  ArrowRightLeft,
  LogOut,
  CheckCircle2,
} from 'lucide-react'
import { inpatientApi } from '../../services/api/inpatientApi'
import {
  Admission,
  Bed,
  BedAssignment,
  AdmissionStatus,
  AdmissionType,
  DischargeDisposition,
} from '../../types/inpatient'
import { PageHeader, DetailField, ConfirmDialog } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'

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

export const AdmissionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const admissionId = Number(id)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Transfer Bed Modal
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [selectedDestBedId, setSelectedDestBedId] = useState<number | undefined>(undefined)
  const [transferReason, setTransferReason] = useState('')

  // Discharge Modal
  const [isDischargeOpen, setIsDischargeOpen] = useState(false)
  const [dischargeDisposition, setDischargeDisposition] = useState<DischargeDisposition>('HOME_ROUTINE')
  const [dischargeInstructions, setDischargeInstructions] = useState('')
  const [dischargeSummary, setDischargeSummary] = useState('')

  // Fetch Admission details
  const { data: admission, isLoading, error } = useQuery<Admission, Error>({
    queryKey: ['inpatient-admission', admissionId],
    queryFn: () => inpatientApi.getAdmission(admissionId),
    enabled: !isNaN(admissionId),
  })

  // Fetch Available beds for transfer
  const { data: availableBedsData } = useQuery({
    queryKey: ['available-beds-for-transfer', admission?.hospital],
    queryFn: () => inpatientApi.getAvailableBeds({ hospital: admission?.hospital }),
    enabled: isTransferOpen && Boolean(admission?.hospital),
  })
  const availableBeds: Bed[] = Array.isArray(availableBedsData)
    ? availableBedsData
    : availableBedsData?.results || []

  // Fetch Bed history
  const { data: bedHistory = [] } = useQuery<BedAssignment[], Error>({
    queryKey: ['admission-bed-history', admissionId],
    queryFn: () => inpatientApi.getAdmissionBedHistory(admissionId),
    enabled: !isNaN(admissionId),
  })

  // Mutations
  const transferMutation = useMutation({
    mutationFn: ({ destBedId, reason }: { destBedId: number; reason: string }) =>
      inpatientApi.transferPatient(admissionId, destBedId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inpatient-admission', admissionId] })
      queryClient.invalidateQueries({ queryKey: ['admission-bed-history', admissionId] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-beds'] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-occupancy'] })
      setIsTransferOpen(false)
      setSelectedDestBedId(undefined)
      setTransferReason('')
    },
  })

  const dischargeMutation = useMutation({
    mutationFn: (data: { discharge_disposition: DischargeDisposition; discharge_instructions: string; discharge_summary: string }) =>
      inpatientApi.dischargePatient(admissionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inpatient-admission', admissionId] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-admissions'] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-beds'] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-occupancy'] })
      setIsDischargeOpen(false)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !admission) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-800">Admission Record Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          {error?.message || 'The specified inpatient hospitalization record could not be found.'}
        </p>
        <Link
          to="/inpatient/admissions"
          className="inline-block mt-4 text-xs text-blue-600 font-medium hover:underline"
        >
          Return to Admissions
        </Link>
      </div>
    )
  }

  const isStaff = user?.role !== 'PATIENT'

  // Calculate length of stay in days
  const admitDate = new Date(admission.admission_date)
  const endDate = admission.actual_discharge_date ? new Date(admission.actual_discharge_date) : new Date()
  const diffTime = Math.abs(endDate.getTime() - admitDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={`Inpatient Admission: ${admission.admission_reference}`}
        subtitle={`Admitted on ${admitDate.toLocaleDateString([], {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })} (${diffDays} day${diffDays === 1 ? '' : 's'} stay)`}
        backTo="/inpatient/admissions"
        backLabel="Back to Admissions"
      >
        {admission.status === 'ADMITTED' && isStaff && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsTransferOpen(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Transfer Bed
            </button>
            <button
              type="button"
              onClick={() => setIsDischargeOpen(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Discharge Patient
            </button>
          </div>
        )}
      </PageHeader>

      {/* Main Admission Summary Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                statusColors[admission.status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {admission.status_display || admission.status}
            </span>
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-xs border ${
                admissionTypeBadges[admission.admission_type] || 'bg-slate-100 text-slate-700'
              }`}
            >
              Type: {admission.admission_type_display || admission.admission_type}
            </span>
          </div>

          <div className="text-xs text-slate-500">
            Admitted by: <span className="font-medium text-slate-700">{admission.admitted_by_name || 'Hospital Staff'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <DetailField
            label="Inpatient Name"
            value={
              <div>
                <p className="font-semibold text-slate-900">{admission.patient_name || 'Patient #' + admission.patient}</p>
                <p className="text-[11px] text-slate-500 font-mono">MRN: {admission.patient_mrn}</p>
              </div>
            }
          />
          <DetailField
            label="Attending Physician"
            value={
              <div>
                <p className="font-medium text-slate-800">{admission.doctor_name || 'Dr. #' + admission.attending_doctor}</p>
                <p className="text-[11px] text-slate-500">{admission.department_name || 'Clinical Care'}</p>
              </div>
            }
          />
          <DetailField
            label="Facility"
            value={<p className="text-slate-700">{admission.hospital_name}</p>}
          />
          <DetailField
            label="Current Bed Allocation"
            value={
              admission.current_bed ? (
                <div>
                  <p className="font-mono font-bold text-slate-900">
                    {admission.current_ward_name} • Bed {admission.current_bed}
                  </p>
                  <p className="text-[11px] text-slate-500">Room {admission.current_room_number}</p>
                </div>
              ) : (
                <span className="text-slate-400 italic">None currently assigned</span>
              )
            }
          />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
          <p className="text-slate-700">
            <span className="font-semibold text-slate-900">Clinical Admission Reason: </span>
            {admission.admission_reason}
          </p>
          {admission.expected_discharge_date && (
            <p className="text-slate-500 mt-1">
              <span className="font-medium text-slate-700">Estimated Target Discharge: </span>
              {new Date(admission.expected_discharge_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Discharge Summary (if discharged) */}
      {admission.status === 'DISCHARGED' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Discharge Record & Disposition
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Discharge Disposition</span>
              <span className="font-semibold text-slate-800">
                {admission.discharge_disposition_display || admission.discharge_disposition || 'Home Routine'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Discharged Date & Time</span>
              <span className="font-medium text-slate-800">
                {admission.actual_discharge_date ? new Date(admission.actual_discharge_date).toLocaleString() : 'Recorded'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Discharged By</span>
              <span className="font-medium text-slate-800">{admission.discharged_by_name || 'Attending Physician'}</span>
            </div>
          </div>

          {admission.discharge_instructions && (
            <div className="text-xs bg-slate-50 p-3 rounded border border-slate-200 mt-2">
              <span className="font-semibold text-slate-900 block mb-0.5">Post-Discharge Instructions:</span>
              <p className="text-slate-700">{admission.discharge_instructions}</p>
            </div>
          )}

          {admission.discharge_summary && (
            <div className="text-xs bg-slate-50 p-3 rounded border border-slate-200">
              <span className="font-semibold text-slate-900 block mb-0.5">Discharge Clinical Summary:</span>
              <p className="text-slate-700">{admission.discharge_summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Bed Assignment Movement & Audit History */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center">
            <BedIcon className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Bed Movement & Allocation History ({bedHistory.length || admission.bed_assignments?.length || 0})
          </h3>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {(bedHistory.length > 0 ? bedHistory : admission.bed_assignments || []).map(
            (assign: BedAssignment) => (
              <div key={assign.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Bed {assign.bed_number}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {assign.ward_name} (Room {assign.room_number})
                    </span>
                    {assign.is_active ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Current Bed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                        Released
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Allocated: {new Date(assign.start_time).toLocaleString()}{' '}
                    {assign.assigned_by_name && `by ${assign.assigned_by_name}`}
                    {assign.end_time && ` • Released: ${new Date(assign.end_time).toLocaleString()}`}
                  </p>
                  {assign.reason && (
                    <p className="text-[11px] text-slate-600 italic">
                      Transfer reason: {assign.reason}
                    </p>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Transfer Bed Modal */}
      <ConfirmDialog
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Patient to Destination Bed"
        confirmLabel="Execute Bed Transfer"
        isLoading={transferMutation.isPending}
        onConfirm={() => {
          if (selectedDestBedId && transferReason.trim()) {
            transferMutation.mutate({
              destBedId: selectedDestBedId,
              reason: transferReason.trim(),
            })
          }
        }}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Reallocate patient {admission.patient_name} from Bed {admission.current_bed || 'Current'} to a new clinical unit:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Available Bed *
            </label>
            <select
              value={selectedDestBedId || ''}
              onChange={(e) => setSelectedDestBedId(Number(e.target.value))}
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Destination Bed...</option>
              {availableBeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.ward_name} — Room {b.room_number} (Bed {b.bed_number} - {b.bed_type_display || b.bed_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Reason for Bed Transfer *
            </label>
            <input
              type="text"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. ICU step-down, Surgical recovery, Isolation required..."
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </ConfirmDialog>

      {/* Discharge Dialog */}
      <ConfirmDialog
        isOpen={isDischargeOpen}
        onClose={() => setIsDischargeOpen(false)}
        title="Discharge Inpatient"
        confirmLabel="Authorize Discharge"
        isLoading={dischargeMutation.isPending}
        onConfirm={() => {
          dischargeMutation.mutate({
            discharge_disposition: dischargeDisposition,
            discharge_instructions: dischargeInstructions,
            discharge_summary: dischargeSummary,
          })
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
              placeholder="Medications to continue, wound care, followup appointment date..."
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
              placeholder="Inpatient course summary, response to treatment, final condition..."
              rows={2}
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
export default AdmissionDetailsPage
