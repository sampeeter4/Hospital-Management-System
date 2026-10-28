import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Clock,
  User,
  CheckCircle,
  Play,
  Check,
  XCircle,
  Edit2,
  Calendar,
  FileText,
  AlertCircle,
  History,
} from 'lucide-react'
import { appointmentApi } from '../../services/api/appointmentApi'
import {
  Appointment,
  AppointmentStatus,
  AppointmentStatusHistory,
} from '../../types/appointments'
import { PageHeader, DetailField, ConfirmDialog } from '../../components/ui'

const STATUS_BADGES: Record<AppointmentStatus, { label: string; bg: string; text: string; border: string }> = {
  PENDING: { label: 'Pending Confirmation', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  CONFIRMED: { label: 'Confirmed', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  CHECKED_IN: { label: 'Patient Checked In', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  IN_PROGRESS: { label: 'Consultation In Progress', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  COMPLETED: { label: 'Consultation Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  NO_SHOW: { label: 'Patient No Show', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
}

export const AppointmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Modals state
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')

  // Fetch Appointment
  const { data: appointment, isLoading, isError, error } = useQuery<Appointment, Error>({
    queryKey: ['appointment', id],
    queryFn: () => appointmentApi.getAppointment(id!),
    enabled: !!id,
  })

  // Fetch Status History
  const { data: history = [] } = useQuery<AppointmentStatusHistory[], Error>({
    queryKey: ['appointment-history', id],
    queryFn: () => appointmentApi.getAppointmentHistory(id!),
    enabled: !!id,
  })

  // Status mutations
  const confirmMutation = useMutation({
    mutationFn: () => appointmentApi.confirmAppointment(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      queryClient.invalidateQueries({ queryKey: ['appointment-history', id] })
    },
  })

  const checkInMutation = useMutation({
    mutationFn: () => appointmentApi.checkInAppointment(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      queryClient.invalidateQueries({ queryKey: ['appointment-history', id] })
    },
  })

  const startMutation = useMutation({
    mutationFn: () => appointmentApi.startAppointment(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      queryClient.invalidateQueries({ queryKey: ['appointment-history', id] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: () => appointmentApi.completeAppointment(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      queryClient.invalidateQueries({ queryKey: ['appointment-history', id] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => appointmentApi.cancelAppointment(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      queryClient.invalidateQueries({ queryKey: ['appointment-history', id] })
      setIsCancelOpen(false)
      setCancelReason('')
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: (params: { appointment_date: string; start_time: string; end_time: string }) =>
      appointmentApi.rescheduleAppointment(id!, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      queryClient.invalidateQueries({ queryKey: ['appointment-history', id] })
      setIsRescheduleOpen(false)
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

  if (isError || !appointment) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load appointment details: {error?.message || 'Not found'}
        </div>
        <button
          onClick={() => navigate('/appointments')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
        >
          Back to Appointments
        </button>
      </div>
    )
  }

  const badge = STATUS_BADGES[appointment.status] || STATUS_BADGES.PENDING
  const isTerminal = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={`Appointment ${appointment.appointment_reference}`}
        subtitle={`Clinical consultation on ${appointment.appointment_date} with Dr. ${appointment.doctor_name}`}
        backTo="/appointments"
        backLabel="Back to Appointments"
        actions={
          <div className="flex items-center gap-2">
            {appointment.status === 'PENDING' && (
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Confirm Appointment
              </button>
            )}

            {appointment.status === 'CONFIRMED' && (
              <button
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors shadow-2xs cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                Check In Patient
              </button>
            )}

            {appointment.status === 'CHECKED_IN' && (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-2xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Start Consultation
              </button>
            )}

            {appointment.status === 'IN_PROGRESS' && (
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-2xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Complete Consultation
              </button>
            )}

            {!isTerminal && (
              <>
                <button
                  onClick={() => {
                    setNewDate(appointment.appointment_date)
                    setNewStartTime(appointment.start_time)
                    setNewEndTime(appointment.end_time)
                    setIsRescheduleOpen(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Reschedule
                </button>
                <button
                  onClick={() => setIsCancelOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </>
            )}

            <button
              onClick={() => navigate(`/appointments/${id}/edit`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Notes
            </button>
          </div>
        }
      />

      {/* Main Status & Quick Information Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900">
                {appointment.appointment_reference}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {badge.label}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                {appointment.appointment_type.toLowerCase().replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 font-mono font-medium text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {appointment.appointment_date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono font-medium text-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {appointment.start_time?.slice(0, 5)} - {appointment.end_time?.slice(0, 5)}
              </span>
              <span>•</span>
              <span>Booked: {new Date(appointment.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={() => navigate(`/patients/${appointment.patient}`)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              Open Patient EHR File →
            </button>
          </div>
        </div>

        {appointment.cancellation_reason && (
          <div className="mt-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              Cancelled on {appointment.cancelled_at || 'record'}:
            </div>
            <p className="mt-1 pl-5">{appointment.cancellation_reason}</p>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Patient & Facility Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Patient & Assignment
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Patient Full Name" value={appointment.patient_name} />
            <DetailField label="Medical Record Number" value={appointment.patient_mrn} mono />
            <DetailField label="Attending Physician" value={`Dr. ${appointment.doctor_name}`} />
            <DetailField label="Doctor ID Code" value={appointment.doctor_id_code} mono />
            <DetailField label="Hospital Facility" value={appointment.hospital_name} />
            <DetailField label="Clinical Department" value={appointment.department_name} />
          </div>
        </div>

        {/* Visit Clinical Reason & Notes Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Clinical Notes & Reason
          </h3>
          <div className="space-y-3">
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Reason for Visit / Chief Complaint
              </span>
              <p className="text-xs text-slate-800 mt-1">
                {appointment.reason_for_visit || 'Routine Consultation / Checkup'}
              </p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Patient Stated Notes
              </span>
              <p className="text-xs text-slate-600 mt-1">
                {appointment.patient_notes || 'No patient notes provided.'}
              </p>
            </div>
            {appointment.staff_notes && (
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Internal Staff Clinical Notes
                </span>
                <p className="text-xs text-slate-600 mt-1 font-mono bg-slate-50 p-2 rounded border border-slate-100">
                  {appointment.staff_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status Transition History */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-500" />
            Appointment Lifecycle & Audit Trail
          </h3>

          {history.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">No status change events logged yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((h) => (
                <div key={h.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {h.previous_status} → {h.new_status}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">
                        by <strong>{h.changed_by_username || 'Staff'}</strong>
                      </span>
                    </div>
                    {h.reason && <p className="text-[11px] text-slate-600 mt-0.5">{h.reason}</p>}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {new Date(h.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {isCancelOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Cancel Appointment"
          description="Are you sure you want to cancel this appointment? This action is permanent."
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
            <label htmlFor="cancel-reason-detail" className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason *
            </label>
            <textarea
              id="cancel-reason-detail"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Patient rescheduled, physician unavailable..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </ConfirmDialog>
      )}

      {/* Reschedule Dialog */}
      {isRescheduleOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Reschedule Appointment"
          description="Select the new date and time interval for this appointment."
          confirmLabel={rescheduleMutation.isPending ? 'Rescheduling...' : 'Save New Schedule'}
          cancelLabel="Cancel"
          variant="primary"
          onCancel={() => setIsRescheduleOpen(false)}
          onConfirm={() => {
            if (newDate && newStartTime && newEndTime) {
              rescheduleMutation.mutate({
                appointment_date: newDate,
                start_time: newStartTime,
                end_time: newEndTime,
              })
            }
          }}
        >
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="resched-date" className="block text-xs font-semibold text-slate-700 mb-1">
                New Date *
              </label>
              <input
                id="resched-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="resched-start" className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Time *
                </label>
                <input
                  id="resched-start"
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label htmlFor="resched-end" className="block text-xs font-semibold text-slate-700 mb-1">
                  End Time *
                </label>
                <input
                  id="resched-end"
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}

export default AppointmentDetailsPage
