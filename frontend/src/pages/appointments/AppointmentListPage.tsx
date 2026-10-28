import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Eye,
  CheckCircle,
  Play,
  Check,
  XCircle,
  CalendarDays,
  List,
} from 'lucide-react'
import { appointmentApi } from '../../services/api/appointmentApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import {
  Appointment,
  AppointmentStatus,
} from '../../types/appointments'
import { Doctor, Department } from '../../types/hospitals'
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterBar,
  Pagination,
  ConfirmDialog,
} from '../../components/ui'

const STATUS_BADGES: Record<AppointmentStatus, { label: string; bg: string; text: string; border: string }> = {
  PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  CONFIRMED: { label: 'Confirmed', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  CHECKED_IN: { label: 'Checked In', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  NO_SHOW: { label: 'No Show', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
}

export const AppointmentListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | ''>('')
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [selectedDept, setSelectedDept] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Cancel dialog state
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  // Fetch Doctors & Departments for filters
  const { data: doctors = [] } = useQuery<Doctor[], Error>({
    queryKey: ['doctors'],
    queryFn: () => hospitalApi.getDoctors(),
  })

  const { data: departments = [] } = useQuery<Department[], Error>({
    queryKey: ['departments'],
    queryFn: () => hospitalApi.getDepartments(),
  })

  // Fetch Appointments
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      'appointments',
      {
        page,
        search: searchTerm,
        status: selectedStatus,
        doctor: selectedDoctor,
        department: selectedDept,
        appointment_date: selectedDate,
      },
    ],
    queryFn: () =>
      appointmentApi.getAppointments({
        page,
        page_size: pageSize,
        search: searchTerm || undefined,
        status: selectedStatus || undefined,
        doctor: selectedDoctor || undefined,
        department: selectedDept || undefined,
        appointment_date: selectedDate || undefined,
      }),
  })

  const appointments = data?.results || []
  const totalCount = data?.count || 0

  // Status transition mutations
  const confirmMutation = useMutation({
    mutationFn: (id: number) => appointmentApi.confirmAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const checkInMutation = useMutation({
    mutationFn: (id: number) => appointmentApi.checkInAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const startMutation = useMutation({
    mutationFn: (id: number) => appointmentApi.startAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => appointmentApi.completeAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      appointmentApi.cancelAppointment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setCancelTargetId(null)
      setCancelReason('')
    },
  })

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedStatus('')
    setSelectedDoctor('')
    setSelectedDept('')
    setSelectedDate('')
    setPage(1)
  }

  const columns = [
    {
      key: 'reference',
      header: 'Reference & Type',
      render: (apt: Appointment) => (
        <div>
          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {apt.appointment_reference}
          </span>
          <div className="text-[11px] text-slate-500 mt-1 capitalize font-medium">
            {apt.appointment_type.toLowerCase().replace('_', ' ')}
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient Details',
      render: (apt: Appointment) => (
        <div>
          <button
            onClick={() => navigate(`/patients/${apt.patient}`)}
            className="font-semibold text-xs text-slate-900 hover:text-blue-600 hover:underline cursor-pointer text-left block"
          >
            {apt.patient_name || `Patient #${apt.patient}`}
          </button>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            MRN: {apt.patient_mrn}
          </div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Physician & Department',
      render: (apt: Appointment) => (
        <div>
          <div className="font-medium text-xs text-slate-800">
            Dr. {apt.doctor_name || `Doctor #${apt.doctor}`}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {apt.department_name || 'General OPD'}
          </div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Date & Time',
      render: (apt: Appointment) => (
        <div className="text-xs">
          <div className="font-medium text-slate-900 font-mono">
            {apt.appointment_date}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            {apt.start_time?.slice(0, 5)} - {apt.end_time?.slice(0, 5)}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (apt: Appointment) => {
        const badge = STATUS_BADGES[apt.status] || STATUS_BADGES.PENDING
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
      render: (apt: Appointment) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => navigate(`/appointments/${apt.id}`)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Quick status actions based on current status */}
          {apt.status === 'PENDING' && (
            <button
              onClick={() => confirmMutation.mutate(apt.id)}
              disabled={confirmMutation.isPending}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Confirm Appointment"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          )}

          {apt.status === 'CONFIRMED' && (
            <button
              onClick={() => checkInMutation.mutate(apt.id)}
              disabled={checkInMutation.isPending}
              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Check In Patient"
            >
              <User className="w-3.5 h-3.5" />
            </button>
          )}

          {apt.status === 'CHECKED_IN' && (
            <button
              onClick={() => startMutation.mutate(apt.id)}
              disabled={startMutation.isPending}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="Start Consultation"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          {apt.status === 'IN_PROGRESS' && (
            <button
              onClick={() => completeMutation.mutate(apt.id)}
              disabled={completeMutation.isPending}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
              title="Complete Consultation"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}

          {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status) && (
            <button
              onClick={() => setCancelTargetId(apt.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              title="Cancel Appointment"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments & Clinical Scheduling"
        subtitle="Manage outpatient bookings, doctor consultation slots, patient check-ins and queues"
        actions={
          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Schedule View
              </button>
            </div>

            <button
              onClick={() => navigate('/appointments/new')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Book Appointment
            </button>
          </div>
        }
      />

      {isError && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load appointments: {error.message}
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar onReset={handleResetFilters}>
        <div className="w-full sm:w-64">
          <SearchInput
            placeholder="Search Reference, Patient, MRN..."
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
              setSelectedStatus(e.target.value as AppointmentStatus | '')
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>
        </div>

        <div>
          <select
            value={selectedDoctor}
            onChange={(e) => {
              setSelectedDoctor(e.target.value)
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Physicians</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.doctor_name} ({d.specialization})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value)
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setPage(1)
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>
      </FilterBar>

      {/* Main View Display */}
      {viewMode === 'list' ? (
        <>
          <DataTable
            columns={columns}
            data={appointments}
            isLoading={isLoading}
            keyExtractor={(apt) => apt.id}
            emptyState={
              <div className="py-12 text-center">
                <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-700">No appointments found</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Try adjusting the date, physician or status filter.
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
        </>
      ) : (
        /* Schedule View */
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {selectedDate ? `Schedule for ${selectedDate}` : 'All Scheduled Appointments Timeline'}
            </h3>
            <span className="text-xs text-slate-500">
              Showing {appointments.length} appointment slots
            </span>
          </div>

          {appointments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No appointments scheduled for the selected filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {appointments.map((apt) => {
                const badge = STATUS_BADGES[apt.status] || STATUS_BADGES.PENDING
                return (
                  <div
                    key={apt.id}
                    onClick={() => navigate(`/appointments/${apt.id}`)}
                    className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50/50 transition-all cursor-pointer shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-semibold text-blue-700">
                          {apt.appointment_reference}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-slate-900">
                        {apt.patient_name || `Patient #${apt.patient}`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Dr. {apt.doctor_name || apt.doctor} • {apt.department_name}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 font-mono text-slate-700 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {apt.appointment_date} ({apt.start_time?.slice(0, 5)})
                      </div>
                      <span className="capitalize text-slate-400">
                        {apt.appointment_type.toLowerCase()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Cancel Reason Modal */}
      {cancelTargetId !== null && (
        <ConfirmDialog
          isOpen={true}
          title="Cancel Appointment"
          description="Please state the clinical or administrative reason for cancelling this booking."
          confirmLabel={cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
          cancelLabel="Keep Appointment"
          variant="danger"
          onCancel={() => {
            setCancelTargetId(null)
            setCancelReason('')
          }}
          onConfirm={() => {
            if (cancelTargetId && cancelReason.trim()) {
              cancelMutation.mutate({ id: cancelTargetId, reason: cancelReason })
            }
          }}
        >
          <div className="mt-3">
            <label htmlFor="cancel-reason" className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason *
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Patient requested cancellation due to scheduling conflict..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}

export default AppointmentListPage
