import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { inpatientApi } from '../../services/api/inpatientApi'
import { patientApi } from '../../services/api/patientApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import { AdmissionInput, AdmissionType, Bed } from '../../types/inpatient'
import { Doctor } from '../../types/hospitals'
import { Patient } from '../../types/patients'
import { PageHeader, FormSection } from '../../components/ui'

const admissionSchema = z.object({
  patient: z.number().min(1, 'Please select a patient file'),
  attending_doctor: z.number().min(1, 'Please select the attending physician'),
  admission_type: z.enum(['EMERGENCY', 'ELECTIVE', 'NEWBORN', 'URGENT', 'TRANSFER']),
  admission_reason: z.string().min(3, 'Clinical reason for admission is required'),
  expected_discharge_date: z.string().optional(),
  initial_bed_id: z.number().optional().nullable(),
})

type AdmissionFormData = z.infer<typeof admissionSchema>

export const AdmissionCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const preselectedBedId = searchParams.get('bedId')
  const preselectedPatient = searchParams.get('patient')
  const preselectedDoctor = searchParams.get('doctor')

  const [selectedBedId, setSelectedBedId] = useState<number | undefined>(
    preselectedBedId ? Number(preselectedBedId) : undefined
  )

  // Fetch Patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients-picker'],
    queryFn: () => patientApi.getPatients({ page_size: 100 }),
  })
  const patients: Patient[] = patientsData?.results || []

  // Fetch Doctors
  const { data: doctors = [] } = useQuery<Doctor[], Error>({
    queryKey: ['doctors'],
    queryFn: () => hospitalApi.getDoctors(),
  })

  // Fetch Available Beds
  const { data: availableBedsData, isLoading: isLoadingBeds } = useQuery({
    queryKey: ['available-beds-picker'],
    queryFn: () => inpatientApi.getAvailableBeds(),
  })
  const availableBeds: Bed[] = Array.isArray(availableBedsData)
    ? availableBedsData
    : availableBedsData?.results || []

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdmissionFormData>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      patient: preselectedPatient ? Number(preselectedPatient) : undefined,
      attending_doctor: preselectedDoctor ? Number(preselectedDoctor) : undefined,
      admission_type: 'EMERGENCY',
      admission_reason: '',
      expected_discharge_date: '',
      initial_bed_id: preselectedBedId ? Number(preselectedBedId) : null,
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: AdmissionInput) => inpatientApi.createAdmission(data),
    onSuccess: (newAdmission) => {
      queryClient.invalidateQueries({ queryKey: ['inpatient-admissions'] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-beds'] })
      queryClient.invalidateQueries({ queryKey: ['inpatient-occupancy'] })
      navigate(`/inpatient/admissions/${newAdmission.id}`)
    },
  })

  const onSubmit = (formData: AdmissionFormData) => {
    createMutation.mutate({
      patient: Number(formData.patient),
      attending_doctor: Number(formData.attending_doctor),
      admission_type: formData.admission_type as AdmissionType,
      admission_reason: formData.admission_reason,
      expected_discharge_date: formData.expected_discharge_date || undefined,
      initial_bed_id: selectedBedId || null,
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Admit Patient to Inpatient Care"
        subtitle="Record clinical admission, assign attending doctor, and allocate hospital bed"
        backTo="/inpatient/admissions"
        backLabel="Back to Admissions"
      />

      {createMutation.isError && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to create inpatient admission: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection
          title="Patient & Attending Physician"
          description="Identify recipient patient and primary admitting medical doctor"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="admit-patient" className="block text-xs font-semibold text-slate-700 mb-1">
                Patient File *
              </label>
              <select
                id="admit-patient"
                {...register('patient', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.patient_name || p.username} ({p.mrn})
                  </option>
                ))}
              </select>
              {errors.patient && (
                <p className="mt-1 text-xs text-rose-500">{errors.patient.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="admit-doctor" className="block text-xs font-semibold text-slate-700 mb-1">
                Attending Physician *
              </label>
              <select
                id="admit-doctor"
                {...register('attending_doctor', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.doctor_name || d.doctor_id} ({d.specialization})
                  </option>
                ))}
              </select>
              {errors.attending_doctor && (
                <p className="mt-1 text-xs text-rose-500">{errors.attending_doctor.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="admit-type" className="block text-xs font-semibold text-slate-700 mb-1">
                Admission Intake Type *
              </label>
              <select
                id="admit-type"
                {...register('admission_type')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="EMERGENCY">Emergency (Acute Care)</option>
                <option value="URGENT">Urgent (Unscheduled)</option>
                <option value="ELECTIVE">Elective (Planned Surgery/Care)</option>
                <option value="TRANSFER">Transfer from External Facility</option>
                <option value="NEWBORN">Newborn Delivery Admission</option>
              </select>
              {errors.admission_type && (
                <p className="mt-1 text-xs text-rose-500">{errors.admission_type.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="admit-reason" className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Reason for Hospitalization *
              </label>
              <input
                id="admit-reason"
                type="text"
                {...register('admission_reason')}
                placeholder="e.g. Post-operative observation, severe acute pneumonia, diabetic ketoacidosis"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.admission_reason && (
                <p className="mt-1 text-xs text-rose-500">{errors.admission_reason.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="admit-expected" className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Target Discharge Date
              </label>
              <input
                id="admit-expected"
                type="date"
                {...register('expected_discharge_date')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
        </FormSection>

        {/* Initial Bed Allocation Picker */}
        <FormSection
          title="Inpatient Bed Allocation"
          description="Select an available hospital bed to allocate directly upon admission"
        >
          {isLoadingBeds ? (
            <div className="p-6 text-center text-xs text-slate-500">Checking available beds...</div>
          ) : availableBeds.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
              No beds are currently marked as available. The patient can still be admitted and assigned a bed later from the dashboard.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
              {availableBeds.map((bed) => {
                const isSelected = selectedBedId === bed.id
                return (
                  <div
                    key={bed.id}
                    onClick={() => {
                      const next = isSelected ? undefined : bed.id
                      setSelectedBedId(next)
                      setValue('initial_bed_id', next || null)
                    }}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {bed.bed_number}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Room {bed.room_number}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 mt-0.5">{bed.ward_name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {bed.bed_type_display || bed.bed_type}
                      </p>
                    </div>

                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ml-2 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </FormSection>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/inpatient/admissions')}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
          >
            {createMutation.isPending ? 'Processing Admission...' : 'Admit Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}
export default AdmissionCreatePage
