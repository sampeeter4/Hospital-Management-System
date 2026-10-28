import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pill } from 'lucide-react'
import { pharmacyApi } from '../../services/api/pharmacyApi'
import { patientApi } from '../../services/api/patientApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import { PrescriptionInput, Medicine } from '../../types/pharmacy'
import { Doctor, Hospital } from '../../types/hospitals'
import { Patient } from '../../types/patients'
import { PageHeader, FormSection } from '../../components/ui'

const prescriptionItemSchema = z.object({
  medicine: z.number().min(1, 'Please select a medication'),
  dosage_instructions: z.string().min(1, 'Dosage instructions required (e.g. 1 tab)'),
  route: z.string().min(1, 'Route is required'),
  frequency: z.string().min(1, 'Frequency required (e.g. Twice daily)'),
  duration_value: z.number().min(1, 'Duration must be at least 1'),
  duration_unit: z.enum(['DAYS', 'WEEKS', 'MONTHS']),
  quantity_prescribed: z.number().min(1, 'Quantity must be at least 1'),
  patient_instructions: z.string().optional(),
})

const prescriptionSchema = z.object({
  patient: z.number().min(1, 'Please select a patient'),
  doctor: z.number().min(1, 'Please select a prescribing physician'),
  hospital: z.number().min(1, 'Please select a hospital facility'),
  clinical_indication: z.string().optional(),
  general_instructions: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1, 'Add at least one prescribed medication'),
})

type PrescriptionFormData = z.infer<typeof prescriptionSchema>

export const PrescriptionCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const preselectedPatient = searchParams.get('patient')
  const preselectedDoctor = searchParams.get('doctor')

  const [selectedHospitalId, setSelectedHospitalId] = useState<number | undefined>(undefined)

  // Fetch Patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients-picker'],
    queryFn: () => patientApi.getPatients({ page_size: 100 }),
  })
  const patients: Patient[] = patientsData?.results || []

  // Fetch Hospitals
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  // Fetch Doctors
  const { data: doctors = [] } = useQuery<Doctor[], Error>({
    queryKey: ['doctors', { hospital: selectedHospitalId }],
    queryFn: () =>
      hospitalApi.getDoctors(selectedHospitalId ? { hospital: selectedHospitalId } : undefined),
  })

  // Fetch Medicines catalogue
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-picker'],
    queryFn: () => pharmacyApi.getMedicines({ is_active: true }),
  })
  const medicines: Medicine[] = medicinesData?.results || []

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patient: preselectedPatient ? Number(preselectedPatient) : undefined,
      doctor: preselectedDoctor ? Number(preselectedDoctor) : undefined,
      hospital: undefined,
      clinical_indication: '',
      general_instructions: '',
      items: [
        {
          medicine: undefined,
          dosage_instructions: '1 tablet',
          route: 'Oral',
          frequency: 'Twice daily after meals',
          duration_value: 7,
          duration_unit: 'DAYS',
          quantity_prescribed: 14,
          patient_instructions: 'Take with full glass of water',
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const createMutation = useMutation({
    mutationFn: (data: PrescriptionInput) => pharmacyApi.createPrescription(data),
    onSuccess: (newRx) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      navigate(`/pharmacy/prescriptions/${newRx.id}`)
    },
  })

  const onSubmit = (formData: PrescriptionFormData) => {
    createMutation.mutate({
      patient: Number(formData.patient),
      doctor: Number(formData.doctor),
      hospital: Number(formData.hospital),
      clinical_indication: formData.clinical_indication,
      general_instructions: formData.general_instructions,
      items: formData.items.map((item) => ({
        ...item,
        medicine: Number(item.medicine),
        duration_value: Number(item.duration_value),
        quantity_prescribed: Number(item.quantity_prescribed),
      })),
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Write Medical Prescription"
        subtitle="Formulate clinical medication orders with dosage instructions, duration, and safety checks"
        backTo="/pharmacy/prescriptions"
        backLabel="Back to Prescriptions"
      />

      {createMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to generate prescription: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Patient & Physician Header */}
        <FormSection
          title="Patient & Prescribing Physician"
          description="Identify recipient patient and authorizing medical doctor"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="rx-patient" className="block text-xs font-semibold text-slate-700 mb-1">
                Patient File *
              </label>
              <select
                id="rx-patient"
                {...register('patient', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.patient_name || p.username} — MRN: {p.mrn}
                  </option>
                ))}
              </select>
              {errors.patient && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.patient.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="rx-hospital" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Facility *
              </label>
              <select
                id="rx-hospital"
                {...register('hospital', {
                  valueAsNumber: true,
                  onChange: (e) => setSelectedHospitalId(e.target.value ? Number(e.target.value) : undefined),
                })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Facility...</option>
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
              <label htmlFor="rx-doctor" className="block text-xs font-semibold text-slate-700 mb-1">
                Prescribing Physician *
              </label>
              <select
                id="rx-doctor"
                {...register('doctor', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Physician...</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.doctor_name} ({doc.specialization})
                  </option>
                ))}
              </select>
              {errors.doctor && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.doctor.message}</p>
              )}
            </div>
          </div>
        </FormSection>

        {/* Dynamic Medications List */}
        <FormSection
          title="Medication Items"
          description="Specify drugs, dosage schedules, course duration and units to dispense"
        >
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 rounded-lg bg-slate-50/75 border border-slate-200 space-y-3 relative">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-blue-600" />
                    Medication #{index + 1}
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor={`med-sel-${index}`} className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Medication Catalogue *
                    </label>
                    <select
                      id={`med-sel-${index}`}
                      {...register(`items.${index}.medicine`, { valueAsNumber: true })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select Drug...</option>
                      {medicines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.generic_name} ({m.brand_name}) — {m.strength} ({m.dosage_form})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`med-dose-${index}`} className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Dosage Instructions *
                    </label>
                    <input
                      id={`med-dose-${index}`}
                      type="text"
                      placeholder="e.g. 1 tablet / 500mg"
                      {...register(`items.${index}.dosage_instructions`)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor={`med-freq-${index}`} className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Frequency Schedule *
                    </label>
                    <input
                      id={`med-freq-${index}`}
                      type="text"
                      placeholder="e.g. Twice daily after food"
                      {...register(`items.${index}.frequency`)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor={`med-dur-${index}`} className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Course Duration *
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        id={`med-dur-${index}`}
                        type="number"
                        min={1}
                        {...register(`items.${index}.duration_value`, { valueAsNumber: true })}
                        className="w-20 px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white font-mono"
                      />
                      <select
                        {...register(`items.${index}.duration_unit`)}
                        className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
                      >
                        <option value="DAYS">Days</option>
                        <option value="WEEKS">Weeks</option>
                        <option value="MONTHS">Months</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`med-qty-${index}`} className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Total Units to Dispense *
                    </label>
                    <input
                      id={`med-qty-${index}`}
                      type="number"
                      min={1}
                      {...register(`items.${index}.quantity_prescribed`, { valueAsNumber: true })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor={`med-ins-${index}`} className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Special Patient Instructions (e.g. warnings, food requirements)
                    </label>
                    <input
                      id={`med-ins-${index}`}
                      type="text"
                      placeholder="e.g. Take with a meal. Do not consume alcohol."
                      {...register(`items.${index}.patient_instructions`)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                append({
                  medicine: 0,
                  dosage_instructions: '1 tablet',
                  route: 'Oral',
                  frequency: 'Once daily',
                  duration_value: 7,
                  duration_unit: 'DAYS',
                  quantity_prescribed: 7,
                  patient_instructions: '',
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Medication
            </button>
          </div>
        </FormSection>

        {/* Indication & Directions */}
        <FormSection
          title="Clinical Indication & General Notes"
          description="Reason for prescription and pharmacy directions"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rx-ind" className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Indication / Diagnosis
              </label>
              <input
                id="rx-ind"
                type="text"
                placeholder="e.g. Acute bronchitis, post-op pain management"
                {...register('clinical_indication')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="rx-gen-ins" className="block text-xs font-semibold text-slate-700 mb-1">
                General Directions for Pharmacy
              </label>
              <input
                id="rx-gen-ins"
                type="text"
                placeholder="e.g. Generic substitution permitted"
                {...register('general_instructions')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate('/pharmacy/prescriptions')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving Prescription...' : 'Save & Issue Prescription'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PrescriptionCreatePage
