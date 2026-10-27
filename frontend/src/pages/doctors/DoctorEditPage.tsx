import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hospitalApi } from '../../services/api/hospitalApi'
import { DoctorInput, Hospital, Department } from '../../types/hospitals'
import { PageHeader, FormSection } from '../../components/ui'

const doctorSchema = z.object({
  user: z.number(),
  hospital: z.number().min(1, 'Please select a hospital facility'),
  department: z.number().min(1, 'Please select a department'),
  doctor_id: z.string().min(3, 'Doctor ID is required'),
  specialization: z.string().min(2, 'Specialization is required'),
  license_number: z.string().min(3, 'Medical license number is required'),
  qualification: z.string().min(2, 'Qualifications are required'),
  experience_years: z.number().min(0),
  consultation_fee: z.number().min(0),
  bio: z.string().optional(),
  is_available: z.boolean(),
})

type DoctorFormData = z.infer<typeof doctorSchema>

export const DoctorEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch Doctor
  const { data: doctor, isLoading: isLoadingDoctor } = useQuery({
    queryKey: ['doctors', id],
    queryFn: () => hospitalApi.getDoctor(id!),
    enabled: !!id,
  })

  // Fetch Hospitals
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  // Fetch Departments
  const { data: departments = [] } = useQuery<Department[], Error>({
    queryKey: ['departments'],
    queryFn: () => hospitalApi.getDepartments(),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      user: 0,
      hospital: 0,
      department: 0,
      doctor_id: '',
      specialization: '',
      license_number: '',
      qualification: '',
      experience_years: 0,
      consultation_fee: 0,
      bio: '',
      is_available: true,
    },
  })

  useEffect(() => {
    if (doctor) {
      reset({
        user: doctor.user,
        hospital: doctor.hospital,
        department: doctor.department,
        doctor_id: doctor.doctor_id,
        specialization: doctor.specialization,
        license_number: doctor.license_number,
        qualification: doctor.qualification,
        experience_years: doctor.experience_years,
        consultation_fee: Number(doctor.consultation_fee),
        bio: doctor.bio || '',
        is_available: doctor.is_available,
      })
    }
  }, [doctor, reset])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<DoctorInput>) => hospitalApi.updateDoctor(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', id] })
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      navigate(`/doctors/${id}`)
    },
  })

  const onSubmit = (formData: DoctorFormData) => {
    updateMutation.mutate({
      ...formData,
      bio: formData.bio || '',
      consultation_fee: String(formData.consultation_fee),
    })
  }

  if (isLoadingDoctor) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={`Edit ${doctor?.doctor_name || 'Doctor Profile'}`}
        subtitle="Update physician clinical specialization, hospital department and fees"
        backTo={`/doctors/${id}`}
        backLabel="Back to Doctor Profile"
      />

      {updateMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to update doctor profile: {updateMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="Facility & Department Assignment"
          description="Hospital location and clinical department assignment"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="doctor-hospital-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Facility *
              </label>
              <select
                id="doctor-hospital-edit"
                {...register('hospital', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="doctor-department-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Department *
              </label>
              <select
                id="doctor-department-edit"
                {...register('department', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Physician Credentials & Licensing"
          description="Identification, license number, specialization and qualifications"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="doctor-id-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor ID *
              </label>
              <input
                id="doctor-id-edit"
                type="text"
                {...register('doctor_id')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="doctor-license-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Medical License Number *
              </label>
              <input
                id="doctor-license-edit"
                type="text"
                {...register('license_number')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="doctor-spec-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Specialization *
              </label>
              <input
                id="doctor-spec-edit"
                type="text"
                {...register('specialization')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="doctor-qual-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Degrees & Qualifications *
              </label>
              <input
                id="doctor-qual-edit"
                type="text"
                {...register('qualification')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Consultation Fees & Biography"
          description="Years in practice, fee rate, and clinical biography"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="doctor-exp-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Experience (Years) *
              </label>
              <input
                id="doctor-exp-edit"
                type="number"
                min={0}
                {...register('experience_years', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="doctor-fee-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Fee (₹ INR) *
              </label>
              <input
                id="doctor-fee-edit"
                type="number"
                min={0}
                step="0.01"
                {...register('consultation_fee', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="doctor-bio-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Physician Biography
              </label>
              <textarea
                id="doctor-bio-edit"
                rows={2}
                {...register('bio')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <input
                  id="doctor-avail-edit"
                  type="checkbox"
                  {...register('is_available')}
                  className="h-4 w-4 rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="doctor-avail-edit" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Doctor is actively available for outpatient consultations
                </label>
              </div>
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate(`/doctors/${id}`)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Doctor Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default DoctorEditPage
