import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientApi } from '../../services/api/patientApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import { PatientInput, Patient } from '../../types/patients'
import { Hospital } from '../../types/hospitals'
import { PageHeader, FormSection } from '../../components/ui'

const patientSchema = z.object({
  user: z.number(),
  hospital: z.number().nullable().optional(),
  date_of_birth: z.string().min(10, 'Valid date of birth required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'] as const),
  blood_group: z.enum([
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
    'UNKNOWN',
  ] as const),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  allergies: z.string().optional(),
  medical_history: z.string().optional(),
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  insurance_member_id: z.string().optional(),
  insurance_expiry_date: z.string().nullable().optional(),
})

type PatientFormData = z.infer<typeof patientSchema>

export const PatientEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch Patient
  const { data: patient, isLoading: isLoadingPatient } = useQuery<Patient, Error>({
    queryKey: ['patient', id],
    queryFn: () => patientApi.getPatient(id!),
    enabled: !!id,
  })

  // Fetch Hospitals
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      user: 0,
      hospital: null,
      date_of_birth: '',
      gender: 'MALE',
      blood_group: 'UNKNOWN',
      phone: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      emergency_contact_name: '',
      emergency_contact_relationship: '',
      emergency_contact_phone: '',
      allergies: '',
      medical_history: '',
      insurance_provider: '',
      insurance_policy_number: '',
      insurance_member_id: '',
      insurance_expiry_date: null,
    },
  })

  useEffect(() => {
    if (patient) {
      reset({
        user: patient.user,
        hospital: patient.hospital,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        blood_group: patient.blood_group,
        phone: patient.phone || '',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        postal_code: patient.postal_code || '',
        emergency_contact_name: patient.emergency_contact_name || '',
        emergency_contact_relationship: patient.emergency_contact_relationship || '',
        emergency_contact_phone: patient.emergency_contact_phone || '',
        allergies: patient.allergies || '',
        medical_history: patient.medical_history || '',
        insurance_provider: patient.insurance_provider || '',
        insurance_policy_number: patient.insurance_policy_number || '',
        insurance_member_id: patient.insurance_member_id || '',
        insurance_expiry_date: patient.insurance_expiry_date || null,
      })
    }
  }, [patient, reset])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<PatientInput>) => patientApi.updatePatient(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', id] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      navigate(`/patients/${id}`)
    },
  })

  const onSubmit = (formData: PatientFormData) => {
    updateMutation.mutate({
      ...formData,
      hospital: formData.hospital ? Number(formData.hospital) : null,
      insurance_expiry_date: formData.insurance_expiry_date || null,
    })
  }

  if (isLoadingPatient) {
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
        title={`Edit ${patient?.patient_name || patient?.username || 'Patient'}`}
        subtitle="Update demographics, contact info, clinical history, and insurance coverage"
        backTo={`/patients/${id}`}
        backLabel="Back to Patient Record"
      />

      {updateMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to update patient record: {updateMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="Patient Identification & Demographics"
          description="MRN and vital demographic parameters"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient-hosp-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Facility
              </label>
              <select
                id="patient-hosp-edit"
                {...register('hospital', { setValueAs: (v) => (v ? Number(v) : null) })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Central Facility</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="patient-dob-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth *
              </label>
              <input
                id="patient-dob-edit"
                type="date"
                {...register('date_of_birth')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {errors.date_of_birth && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.date_of_birth.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="patient-gender-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Gender *
              </label>
              <select
                id="patient-gender-edit"
                {...register('gender')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="patient-blood-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Blood Group
              </label>
              <select
                id="patient-blood-edit"
                {...register('blood_group')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="UNKNOWN">Unknown / Not Tested</option>
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="patient-phone-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                id="patient-phone-edit"
                type="text"
                {...register('phone')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Address & Emergency Contact"
          description="Contact information and residence"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label htmlFor="patient-addr-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Street Address
              </label>
              <input
                id="patient-addr-edit"
                type="text"
                {...register('address')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-city-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                City
              </label>
              <input
                id="patient-city-edit"
                type="text"
                {...register('city')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-state-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                State
              </label>
              <input
                id="patient-state-edit"
                type="text"
                {...register('state')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-postal-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Postal Code
              </label>
              <input
                id="patient-postal-edit"
                type="text"
                {...register('postal_code')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="patient-em-name-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Contact Name
              </label>
              <input
                id="patient-em-name-edit"
                type="text"
                {...register('emergency_contact_name')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-em-rel-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Relationship
              </label>
              <input
                id="patient-em-rel-edit"
                type="text"
                {...register('emergency_contact_relationship')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-em-phone-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Phone
              </label>
              <input
                id="patient-em-phone-edit"
                type="text"
                {...register('emergency_contact_phone')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Clinical History & Allergies"
          description="Baseline medical alerts"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient-allergies-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Known Allergies
              </label>
              <textarea
                id="patient-allergies-edit"
                {...register('allergies')}
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-med-hist-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Medical History Summary
              </label>
              <textarea
                id="patient-med-hist-edit"
                {...register('medical_history')}
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Insurance Policy"
          description="Carrier details and policy numbers"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient-ins-prov-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Insurance Provider
              </label>
              <input
                id="patient-ins-prov-edit"
                type="text"
                {...register('insurance_provider')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-ins-pol-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Policy Number
              </label>
              <input
                id="patient-ins-pol-edit"
                type="text"
                {...register('insurance_policy_number')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="patient-ins-mem-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Member ID
              </label>
              <input
                id="patient-ins-mem-edit"
                type="text"
                {...register('insurance_member_id')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="patient-ins-exp-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Date
              </label>
              <input
                id="patient-ins-exp-edit"
                type="date"
                {...register('insurance_expiry_date')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate(`/patients/${id}`)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Patient Record'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PatientEditPage
