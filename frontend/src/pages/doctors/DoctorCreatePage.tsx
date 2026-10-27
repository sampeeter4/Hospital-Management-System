import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hospitalApi } from '../../services/api/hospitalApi'
import { DoctorInput, Hospital, Department, UserAccountOption } from '../../types/hospitals'
import { PageHeader, FormSection } from '../../components/ui'

const doctorSchema = z.object({
  user: z.number().min(1, 'Please select a system user account'),
  hospital: z.number().min(1, 'Please select a hospital facility'),
  department: z.number().min(1, 'Please select a department'),
  doctor_id: z.string().min(3, 'Doctor ID is required (e.g. DOC-001)'),
  specialization: z.string().min(2, 'Specialization is required'),
  license_number: z.string().min(3, 'Medical license number is required'),
  qualification: z.string().min(2, 'Qualifications are required (e.g. MBBS, MD)'),
  experience_years: z.number().min(0, 'Experience years must be 0 or greater'),
  consultation_fee: z.number().min(0, 'Consultation fee must be 0 or greater'),
  bio: z.string().optional(),
  is_available: z.boolean(),
})

type DoctorFormData = z.infer<typeof doctorSchema>

export const DoctorCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const preselectedHosp = searchParams.get('hospital')
  const preselectedDept = searchParams.get('department')

  const [selectedHospitalId, setSelectedHospitalId] = useState<number | undefined>(
    preselectedHosp ? Number(preselectedHosp) : undefined
  )

  // Fetch Hospitals
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  // Fetch Departments (filtered by selected hospital if available)
  const { data: departments = [] } = useQuery<Department[], Error>({
    queryKey: ['departments', { hospital: selectedHospitalId }],
    queryFn: () =>
      hospitalApi.getDepartments(selectedHospitalId ? { hospital: selectedHospitalId } : undefined),
  })

  // Fetch Available Users with role DOCTOR
  const { data: doctorUsers = [] } = useQuery<UserAccountOption[], Error>({
    queryKey: ['users', 'DOCTOR'],
    queryFn: () => hospitalApi.getUsers('DOCTOR'),
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      user: undefined,
      hospital: preselectedHosp ? Number(preselectedHosp) : undefined,
      department: preselectedDept ? Number(preselectedDept) : undefined,
      doctor_id: '',
      specialization: '',
      license_number: '',
      qualification: '',
      experience_years: 0,
      consultation_fee: 500,
      bio: '',
      is_available: true,
    },
  })

  const handleHospitalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedHospitalId(val ? Number(val) : undefined)
  }

  const createMutation = useMutation({
    mutationFn: (data: DoctorInput) => hospitalApi.createDoctor(data),
    onSuccess: (newDoctor) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      navigate(`/doctors/${newDoctor.id}`)
    },
  })

  const onSubmit = (formData: DoctorFormData) => {
    createMutation.mutate({
      ...formData,
      bio: formData.bio || '',
      consultation_fee: String(formData.consultation_fee),
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Register Doctor Profile"
        subtitle="Create clinical physician credentials, department assignment, and consultation fees"
        backTo="/doctors"
        backLabel="Back to Doctor Directory"
      />

      {createMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to register doctor profile: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="Account & Facility Assignment"
          description="Link physician profile to their system login account and departmental post"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="doctor-user" className="block text-xs font-semibold text-slate-700 mb-1">
                User Account *
              </label>
              <select
                id="doctor-user"
                {...register('user', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Doctor Account...</option>
                {doctorUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.email || 'No email'})
                  </option>
                ))}
              </select>
              {errors.user && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.user.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="doctor-hospital" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Facility *
              </label>
              <select
                id="doctor-hospital"
                {...register('hospital', { valueAsNumber: true, onChange: handleHospitalChange })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Hospital...</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              {errors.hospital && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.hospital.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="doctor-department" className="block text-xs font-semibold text-slate-700 mb-1">
                Department *
              </label>
              <select
                id="doctor-department"
                {...register('department', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              {errors.department && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.department.message}</p>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Physician Credentials & Licensing"
          description="Government registration, specialization and medical qualifications"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="doctor-id-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Doctor ID *
              </label>
              <input
                id="doctor-id-input"
                type="text"
                {...register('doctor_id')}
                placeholder="e.g. DOC-2026-042"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {errors.doctor_id && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.doctor_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="doctor-license" className="block text-xs font-semibold text-slate-700 mb-1">
                Medical License Number *
              </label>
              <input
                id="doctor-license"
                type="text"
                {...register('license_number')}
                placeholder="e.g. MCI-DEL-2015-8812"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {errors.license_number && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.license_number.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="doctor-spec" className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Specialization *
              </label>
              <input
                id="doctor-spec"
                type="text"
                {...register('specialization')}
                placeholder="e.g. Interventional Cardiology & Heart Failure"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.specialization && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.specialization.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="doctor-qual" className="block text-xs font-semibold text-slate-700 mb-1">
                Degrees & Qualifications *
              </label>
              <input
                id="doctor-qual"
                type="text"
                {...register('qualification')}
                placeholder="e.g. MBBS, MD (Med), DM (Cardiology), FACC"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.qualification && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.qualification.message}</p>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Practice & Consultation Settings"
          description="Years in clinical practice and outpatient consultation charges"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="doctor-exp" className="block text-xs font-semibold text-slate-700 mb-1">
                Experience (Years) *
              </label>
              <input
                id="doctor-exp"
                type="number"
                min={0}
                {...register('experience_years', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.experience_years && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.experience_years.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="doctor-fee" className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Fee (₹ INR) *
              </label>
              <input
                id="doctor-fee"
                type="number"
                min={0}
                step="0.01"
                {...register('consultation_fee', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {errors.consultation_fee && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.consultation_fee.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="doctor-bio" className="block text-xs font-semibold text-slate-700 mb-1">
                Physician Biography & Clinical Interests
              </label>
              <textarea
                id="doctor-bio"
                rows={2}
                {...register('bio')}
                placeholder="Fellowship training, clinical specialties, and patient care philosophies..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {createMutation.isPending ? 'Registering...' : 'Save & Register Doctor Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default DoctorCreatePage
