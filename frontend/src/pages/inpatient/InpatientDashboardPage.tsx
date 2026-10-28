import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Users,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Wrench,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'
import { inpatientApi } from '../../services/api/inpatientApi'
import { Bed, Ward, BedStatus, OccupancyReport } from '../../types/inpatient'
import { PageHeader, ConfirmDialog } from '../../components/ui'

const bedStatusStyles: Record<
  BedStatus,
  { bg: string; border: string; text: string; badge: string; icon: React.ReactNode }
> = {
  AVAILABLE: {
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800',
    icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
  },
  OCCUPIED: {
    bg: 'bg-blue-50/70',
    border: 'border-blue-200',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800',
    icon: <Users className="w-3.5 h-3.5 text-blue-600" />,
  },
  CLEANING: {
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200',
    text: 'text-indigo-800',
    badge: 'bg-indigo-100 text-indigo-800',
    icon: <Sparkles className="w-3.5 h-3.5 text-indigo-600" />,
  },
  MAINTENANCE: {
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-800',
    icon: <Wrench className="w-3.5 h-3.5 text-amber-600" />,
  },
  ISOLATION: {
    bg: 'bg-rose-50/70',
    border: 'border-rose-200',
    text: 'text-rose-800',
    badge: 'bg-rose-100 text-rose-800',
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />,
  },
  INACTIVE: {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-500',
    badge: 'bg-slate-200 text-slate-600',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />,
  },
}

export const InpatientDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedWardId, setSelectedWardId] = useState<number | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string>('')

  // State for Bed Status Update
  const [statusChangeBed, setStatusChangeBed] = useState<Bed | null>(null)
  const [newBedStatus, setNewBedStatus] = useState<BedStatus>('AVAILABLE')
  const [statusNotes, setStatusNotes] = useState('')

  // Fetch Wards
  const { data: wardsData } = useQuery({
    queryKey: ['inpatient-wards'],
    queryFn: () => inpatientApi.getWards({ is_active: true }),
  })
  const wards: Ward[] = wardsData?.results || []

  // Fetch Beds
  const { data: bedsData, isLoading: isLoadingBeds } = useQuery({
    queryKey: ['inpatient-beds', { ward: selectedWardId, status: statusFilter }],
    queryFn: () =>
      inpatientApi.getBeds({
        ward: selectedWardId,
        status: (statusFilter as BedStatus) || undefined,
        page_size: 100,
      }),
  })
  const beds: Bed[] = bedsData?.results || []

  // Fetch Hospital Occupancy
  const { data: occupancy } = useQuery<OccupancyReport>({
    queryKey: ['inpatient-occupancy'],
    queryFn: () => inpatientApi.getOccupancyReport(),
  })

  // Mutation to update bed operational status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: BedStatus; notes?: string }) =>
      inpatientApi.updateBedStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inpatient-beds'] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-occupancy'] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-wards'] })
      setStatusChangeBed(null)
      setStatusNotes('')
    },
  })

  const totalBeds = occupancy?.total_capacity || beds.length || 0
  const occupiedBeds = occupancy?.occupied_beds || beds.filter((b) => b.status === 'OCCUPIED').length
  const availableBeds = occupancy?.available_beds || beds.filter((b) => b.status === 'AVAILABLE').length
  const occupancyRate = occupancy?.occupancy_rate_percent ?? (totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inpatient Wards & Bed Management"
        subtitle="Real-time clinical bed census, ward occupancy, and patient admissions"
        action={{
          label: 'Admit Patient',
          icon: <Plus className="w-4 h-4 mr-1" />,
          onClick: () => navigate('/inpatient/admissions/new'),
        }}
      >
        <Link
          to="/inpatient/admissions"
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
        >
          <Users className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          Admissions Roster
        </Link>
      </PageHeader>

      {/* Operational KPI Census Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Inpatient Beds
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{totalBeds}</span>
            <span className="text-xs text-slate-500">census capacity</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block mb-1">
            Occupied Beds
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-blue-700">{occupiedBeds}</span>
            <span className="text-xs font-semibold text-blue-600">({occupancyRate}%)</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block mb-1">
            Available Immediately
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-700">{availableBeds}</span>
            <span className="text-xs text-emerald-600">ready for intake</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block mb-1">
            Turnover & Maintenance
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-700">
              {(occupancy?.cleaning_beds ?? 0) + (occupancy?.maintenance_beds ?? 0)}
            </span>
            <span className="text-xs text-amber-600">cleaning/servicing</span>
          </div>
        </div>
      </div>

      {/* Filter and Ward Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
        {/* Ward Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedWardId(undefined)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              selectedWardId === undefined
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Wards ({wards.length})
          </button>
          {wards.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelectedWardId(w.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedWardId === w.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {w.name} ({w.occupied_beds}/{w.total_beds})
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center space-x-2 shrink-0">
          <label htmlFor="bed-status-filter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Filter Status:
          </label>
          <select
            id="bed-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Bed Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="CLEANING">Cleaning / Housekeeping</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="ISOLATION">Isolation</option>
          </select>
        </div>
      </div>

      {/* Visual Bed Grid */}
      {isLoadingBeds ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : beds.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border border-slate-200 text-xs text-slate-500">
          No beds found matching the chosen criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {beds.map((bed: Bed) => {
            const style = bedStatusStyles[bed.status] || bedStatusStyles.INACTIVE
            return (
              <div
                key={bed.id}
                className={`rounded-lg border p-4 transition-all shadow-xs flex flex-col justify-between ${style.bg} ${style.border}`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {bed.bed_number}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Room {bed.room_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">{bed.ward_name}</p>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${style.badge}`}
                    >
                      {style.icon}
                      <span className="ml-1">{bed.status_display || bed.status}</span>
                    </span>
                  </div>

                  {/* Patient Info if Occupied */}
                  {bed.status === 'OCCUPIED' && (
                    <div className="mt-3 p-2 bg-white/80 rounded border border-blue-100 text-xs space-y-0.5">
                      <p className="font-semibold text-slate-900 truncate">
                        {bed.current_patient_name || 'Admitted Inpatient'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        MRN: {bed.current_patient_mrn || 'N/A'}
                      </p>
                    </div>
                  )}

                  {/* Bed details */}
                  <div className="mt-3 text-[11px] text-slate-500 space-y-0.5">
                    <p>Type: <span className="text-slate-700 font-medium">{bed.bed_type_display || bed.bed_type}</span></p>
                    {bed.equipment_details && (
                      <p className="truncate text-[10px]">Equip: {bed.equipment_details}</p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusChangeBed(bed)
                      setNewBedStatus(bed.status)
                    }}
                    className="text-slate-600 hover:text-slate-900 font-medium hover:underline text-[11px]"
                  >
                    Change Status
                  </button>

                  {bed.status === 'AVAILABLE' && (
                    <Link
                      to={`/inpatient/admissions/new?bedId=${bed.id}`}
                      className="inline-flex items-center font-medium text-emerald-700 hover:text-emerald-900"
                    >
                      Admit to Bed
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  )}

                  {bed.status === 'CLEANING' && (
                    <button
                      type="button"
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: bed.id,
                          status: 'AVAILABLE',
                          notes: 'Completed terminal cleaning and sanitization',
                        })
                      }
                      className="inline-flex items-center text-emerald-700 font-medium hover:underline"
                    >
                      Ready for Patient
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bed Operational Status Update Dialog */}
      <ConfirmDialog
        isOpen={statusChangeBed !== null}
        onClose={() => setStatusChangeBed(null)}
        title={`Update Bed ${statusChangeBed?.bed_number} Status`}
        confirmLabel="Update Operational Status"
        isLoading={updateStatusMutation.isPending}
        onConfirm={() => {
          if (statusChangeBed) {
            updateStatusMutation.mutate({
              id: statusChangeBed.id,
              status: newBedStatus,
              notes: statusNotes,
            })
          }
        }}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Set operational housekeeping or availability state for Room {statusChangeBed?.room_number} Bed {statusChangeBed?.bed_number}:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Status
            </label>
            <select
              value={newBedStatus}
              onChange={(e) => setNewBedStatus(e.target.value as BedStatus)}
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="AVAILABLE">Available (Clean & Ready)</option>
              <option value="CLEANING">Cleaning / Housekeeping</option>
              <option value="MAINTENANCE">Maintenance / Repair</option>
              <option value="ISOLATION">Isolation Protocol</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Notes / Justification
            </label>
            <input
              type="text"
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="e.g. Disinfected after discharge, biomedical inspection complete..."
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
export default InpatientDashboardPage
