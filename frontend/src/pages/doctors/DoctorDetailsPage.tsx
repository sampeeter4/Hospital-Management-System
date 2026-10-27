import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Edit2,
  Power,
  Building2,
  Layers,
  Award,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { hospitalApi } from '../../services/api/hospitalApi'
import { Doctor } from '../../types/hospitals'
import { PageHeader, DetailField, ConfirmDialog } from '../../components/ui'
import { StatusBadge } from '../../components/dashboard'

export const DoctorDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Fetch Doctor Details
  const {
    data: doctor,
    isLoading: isLoadingDoctor,
    error: doctorError,
  } = useQuery<Doctor, Error>({
    queryKey: ['doctors', id],
    queryFn: () => hospitalApi.getDoctor(id!),
    enabled: !!id,
  })

  // Toggle Availability Mutation
  const toggleAvailMutation = useMutation({
    mutationFn: () =>
      hospitalApi.updateDoctor(id!, { is_available: !doctor?.is_available }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', id] })
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      setIsConfirmOpen(false)
    },
  })

  if (isLoadingDoctor) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  if (doctorError || !doctor) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white border border-rose-200 rounded-lg my-10">
        <h3 className="text-base font-bold text-slate-900">Doctor Profile Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          {doctorError?.message || 'The requested doctor record could not be located.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/doctors')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md"
        >
          Return to Doctor Directory
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={doctor.doctor_name || `Doctor ${doctor.doctor_id}`}
        subtitle={`Specialist in ${doctor.specialization}`}
        backTo="/doctors"
        backLabel="Back to Doctor Directory"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/doctors/${doctor.id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                doctor.is_available
                  ? 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
                  : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{doctor.is_available ? 'Mark Offline' : 'Mark Available'}</span>
            </button>
          </div>
        }
      />

      {/* Main Profile Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
              {doctor.doctor_name ? doctor.doctor_name.charAt(0).toUpperCase() : 'D'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{doctor.doctor_name || doctor.doctor_id}</h2>
                <StatusBadge
                  status={doctor.is_available ? 'AVAILABLE' : 'OFFLINE'}
                  variant={doctor.is_available ? 'success' : 'neutral'}
                />
              </div>
              <p className="text-xs text-blue-700 font-semibold mt-0.5">{doctor.specialization}</p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Doctor ID: {doctor.doctor_id} • License: {doctor.license_number}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Consultation Fee</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              ₹{Number(doctor.consultation_fee).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          <DetailField
            label="Department"
            value={
              <Link
                to={`/departments/${doctor.department}`}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-semibold"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {doctor.department_name || `Dept #${doctor.department}`}
              </Link>
            }
          />
          <DetailField
            label="Hospital Facility"
            value={
              <Link
                to={`/hospitals/${doctor.hospital}`}
                className="inline-flex items-center gap-1.5 text-slate-800 hover:text-blue-600 font-medium"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {doctor.hospital_name || `Hospital #${doctor.hospital}`}
              </Link>
            }
          />
          <DetailField
            label="Experience"
            value={`${doctor.experience_years} Years Clinical Practice`}
          />
          <DetailField
            label="Contact Email"
            value={
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {doctor.email || '—'}
              </span>
            }
          />
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DetailField
            label="Qualifications & Degrees"
            value={
              <span className="inline-flex items-center gap-1.5 text-slate-800 font-medium">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                {doctor.qualification}
              </span>
            }
          />
          <DetailField
            label="License Number"
            value={
              <span className="inline-flex items-center gap-1.5 font-mono text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {doctor.license_number}
              </span>
            }
          />
        </div>

        {doctor.bio && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <DetailField
              label="Physician Biography"
              value={<p className="text-slate-700 leading-relaxed text-xs">{doctor.bio}</p>}
            />
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => toggleAvailMutation.mutate()}
        title={doctor.is_available ? 'Mark Doctor Offline' : 'Mark Doctor Available'}
        message={`Are you sure you want to mark ${
          doctor.doctor_name || doctor.doctor_id
        } as ${doctor.is_available ? 'offline' : 'available for consultation'}?`}
        confirmText={doctor.is_available ? 'Set Offline' : 'Set Available'}
        variant={doctor.is_available ? 'warning' : 'primary'}
        isLoading={toggleAvailMutation.isPending}
      />
    </div>
  )
}

export default DoctorDetailsPage
