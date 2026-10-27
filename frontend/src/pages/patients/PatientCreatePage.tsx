import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientApi } from '../../services/api/patientApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import { PatientInput } from '../../types/patients'
import { Hospital, UserAccountOption } from '../../types/hospitals'
import { PageHeader, FormSection } from '../../components/ui'

const patientSchema = z.object({
  user: z.number().min(1, 'Please select an associated patient user account'),
  hospital: z.number().nullable().optional(),
  date_of_birth: z
    .string()
    .min(10, 'Valid date of birth required')
    .refine((dob) => new Date(dob) <= new Date(), {
      message: 'Date of birth cannot be in the future',
    }),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
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

export const PatientCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch Hospitals
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  // Fetch Patient user accounts
  const { data: patientUsers = [] } = useQuery<UserAccountOption[], Error>({
    queryKey: ['users', 'PATIENT'],
    queryFn: () => hospitalApi.getUsers('PATIENT'),
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      user: undefined,
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

  const createMutation = useMutation({
    mutationFn: (data: PatientInput) => patientApi.createPatient(data),
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      navigate(`/patients/${newPatient.id}`)
    },
  })

  const onSubmit = (formData: PatientFormData) => {
    createMutation.mutate({
      ...formData,
      hospital: formData.hospital ? Number(formData.hospital) : null,
      insurance_expiry_date: formData.insurance_expiry_date || null,
      phone: formData.phone || '',
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      postal_code: formData.postal_code || '',
      emergency_contact_name: formData.emergency_contact_name || '',
      emergency_contact_relationship: formData.emergency_contact_relationship || '',
      emergency_contact_phone: formData.emergency_contact_phone || '',
      allergies: formData.allergies || '',
      medical_history: formData.medical_history || '',
      insurance_provider: formData.insurance_provider || '',
      insurance_policy_number: formData.insurance_policy_number || '',
      insurance_member_id: formData.insurance_member_id || '',
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Register New Patient"
        subtitle="Establish clinical EHR profile, identity MRN, contact information, and insurance coverage"
        backTo="/patients"
        backLabel="Back to Patient Directory"
      />

      {createMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to create patient profile: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Section 1: User & Core Demographics */}
        <FormSection
          title="Patient Account & Identification"
          description="Link patient profile to a system login account and specify core demographics"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="patient-user" className="block text-xs font-semibold text-slate-700 mb-1">
                Patient User Account *
              </label>
              <select
                id="patient-user"
                {...register('user', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Registered User...</option>
                {patientUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} — {u.email || 'No email registered'}
                  </option>
                ))}
              </select>
              {errors.user && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.user.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="patient-facility" className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Hospital Facility
              </label>
              <select
                id="patient-facility"
                {...register('hospital', { setValueAs: (v) => (v ? Number(v) : null) })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Central / General Facility</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="patient-dob" className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth *
              </label>
              <input
                id="patient-dob"
                type="date"
                {...register('date_of_birth')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {errors.date_of_birth && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.date_of_birth.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="patient-gender" className="block text-xs font-semibold text-slate-700 mb-1">
                Gender *
              </label>
              <select
                id="patient-gender"
                {...register('gender')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.gender && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.gender.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="patient-blood" className="block text-xs font-semibold text-slate-700 mb-1">
                Blood Group
              </label>
              <select
                id="patient-blood"
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

            <div>
              <label htmlFor="patient-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Direct Contact Phone
              </label>
              <input
                id="patient-phone"
                type="text"
                {...register('phone')}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </FormSection>

        {/* Section 2: Address & Emergency Contact */}
        <FormSection
          title="Residential Address & Emergency Contact"
          description="Contact details for next of kin and residence"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label htmlFor="patient-addr" className="block text-xs font-semibold text-slate-700 mb-1">
                Street Address
              </label>
              <input
                id="patient-addr"
                type="text"
                {...register('address')}
                placeholder="124 Healthcare Boulevard, Suite 300"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-city" className="block text-xs font-semibold text-slate-700 mb-1">
                City
              </label>
              <input
                id="patient-city"
                type="text"
                {...register('city')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-state" className="block text-xs font-semibold text-slate-700 mb-1">
                State / Province
              </label>
              <input
                id="patient-state"
                type="text"
                {...register('state')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-postal" className="block text-xs font-semibold text-slate-700 mb-1">
                Postal Code
              </label>
              <input
                id="patient-postal"
                type="text"
                {...register('postal_code')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="patient-em-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Contact Name
              </label>
              <input
                id="patient-em-name"
                type="text"
                {...register('emergency_contact_name')}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-em-rel" className="block text-xs font-semibold text-slate-700 mb-1">
                Relationship
              </label>
              <input
                id="patient-em-rel"
                type="text"
                {...register('emergency_contact_relationship')}
                placeholder="Spouse / Parent / Sibling"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-em-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Phone Number
              </label>
              <input
                id="patient-em-phone"
                type="text"
                {...register('emergency_contact_phone')}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </FormSection>

        {/* Section 3: Clinical Background & Allergies */}
        <FormSection
          title="Clinical History & Allergies"
          description="Crucial medical alerts and baseline health history"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient-allergies" className="block text-xs font-semibold text-slate-700 mb-1">
                Known Allergies (Food / Drug / Latex)
              </label>
              <textarea
                id="patient-allergies"
                {...register('allergies')}
                rows={3}
                placeholder="e.g. Penicillin, Peanuts, Sulfa antibiotics..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-med-hist" className="block text-xs font-semibold text-slate-700 mb-1">
                Pre-existing Medical History Summary
              </label>
              <textarea
                id="patient-med-hist"
                {...register('medical_history')}
                rows={3}
                placeholder="e.g. Type II Diabetes (diagnosed 2021), Hypertension..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        {/* Section 4: Insurance Coverage */}
        <FormSection
          title="Health Insurance Policy"
          description="Third-party insurance carrier and policy identification"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient-ins-prov" className="block text-xs font-semibold text-slate-700 mb-1">
                Insurance Provider Name
              </label>
              <input
                id="patient-ins-prov"
                type="text"
                {...register('insurance_provider')}
                placeholder="e.g. BlueCross / Aetna / UnitedHealthcare"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="patient-ins-pol" className="block text-xs font-semibold text-slate-700 mb-1">
                Policy Number
              </label>
              <input
                id="patient-ins-pol"
                type="text"
                {...register('insurance_policy_number')}
                placeholder="e.g. POL-9923842"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="patient-ins-mem" className="block text-xs font-semibold text-slate-700 mb-1">
                Member ID
              </label>
              <input
                id="patient-ins-mem"
                type="text"
                {...register('insurance_member_id')}
                placeholder="e.g. MEM-772183"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="patient-ins-exp" className="block text-xs font-semibold text-slate-700 mb-1">
                Policy Expiration Date
              </label>
              <input
                id="patient-ins-exp"
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
            onClick={() => navigate('/patients')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {createMutation.isPending ? 'Registering Patient...' : 'Save & Register Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PatientCreatePage
