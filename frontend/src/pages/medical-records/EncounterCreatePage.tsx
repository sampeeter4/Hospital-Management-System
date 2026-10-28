import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { medicalRecordApi } from '../../services/api/medicalRecordApi'
import { patientApi } from '../../services/api/patientApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import { EncounterInput } from '../../types/medicalRecords'
import { Doctor, Department, Hospital } from '../../types/hospitals'
import { Patient } from '../../types/patients'
import { PageHeader, FormSection } from '../../components/ui'

const encounterSchema = z.object({
  patient: z.number().min(1, 'Please select a patient'),
  doctor: z.number().min(1, 'Please select an attending physician'),
  hospital: z.number().min(1, 'Please select a hospital facility'),
  department: z.number().min(1, 'Please select a clinical department'),
  appointment: z.number().nullable().optional(),
  encounter_type: z.enum([
    'OUTPATIENT',
    'EMERGENCY',
    'INPATIENT',
    'TELEHEALTH',
    'FOLLOW_UP',
  ]),
  encounter_date: z.string().min(10, 'Encounter date is required'),
  chief_complaint: z.string().min(3, 'Chief complaint is required'),
  history_of_present_illness: z.string().optional(),
  clinical_notes_summary: z.string().optional(),
})

type EncounterFormData = z.infer<typeof encounterSchema>

export const EncounterCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const preselectedPatient = searchParams.get('patient')
  const preselectedApt = searchParams.get('appointment')

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

  // Fetch Departments
  const { data: departments = [] } = useQuery<Department[], Error>({
    queryKey: ['departments', { hospital: selectedHospitalId }],
    queryFn: () =>
      hospitalApi.getDepartments(selectedHospitalId ? { hospital: selectedHospitalId } : undefined),
  })

  // Fetch Doctors
  const { data: doctors = [] } = useQuery<Doctor[], Error>({
    queryKey: ['doctors', { hospital: selectedHospitalId }],
    queryFn: () =>
      hospitalApi.getDoctors(selectedHospitalId ? { hospital: selectedHospitalId } : undefined),
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EncounterFormData>({
    resolver: zodResolver(encounterSchema),
    defaultValues: {
      patient: preselectedPatient ? Number(preselectedPatient) : undefined,
      doctor: undefined,
      hospital: undefined,
      department: undefined,
      appointment: preselectedApt ? Number(preselectedApt) : null,
      encounter_type: 'OUTPATIENT',
      encounter_date: new Date().toISOString().split('T')[0],
      chief_complaint: '',
      history_of_present_illness: '',
      clinical_notes_summary: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: EncounterInput) => medicalRecordApi.createEncounter(data),
    onSuccess: (newEncounter) => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] })
      navigate(`/medical-records/encounters/${newEncounter.id}`)
    },
  })

  const onSubmit = (formData: EncounterFormData) => {
    createMutation.mutate({
      ...formData,
      patient: Number(formData.patient),
      doctor: Number(formData.doctor),
      hospital: Number(formData.hospital),
      department: Number(formData.department),
      appointment: formData.appointment ? Number(formData.appointment) : null,
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Start Clinical Consultation Encounter"
        subtitle="Initiate an active electronic medical record consultation session with diagnostic documentation"
        backTo="/medical-records"
        backLabel="Back to Medical Records"
      />

      {createMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to start clinical encounter: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Patient & Facility Assignment */}
        <FormSection
          title="Patient & Clinical Assignment"
          description="Identify the patient file, attending physician, and departmental facility"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="enc-patient" className="block text-xs font-semibold text-slate-700 mb-1">
                Patient File *
              </label>
              <select
                id="enc-patient"
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
              <label htmlFor="enc-hospital" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Facility *
              </label>
              <select
                id="enc-hospital"
                {...register('hospital', {
                  valueAsNumber: true,
                  onChange: (e) => setSelectedHospitalId(e.target.value ? Number(e.target.value) : undefined),
                })}
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
              <label htmlFor="enc-dept" className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Department *
              </label>
              <select
                id="enc-dept"
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

            <div>
              <label htmlFor="enc-doctor" className="block text-xs font-semibold text-slate-700 mb-1">
                Attending Physician *
              </label>
              <select
                id="enc-doctor"
                {...register('doctor', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Doctor...</option>
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

            <div>
              <label htmlFor="enc-modality" className="block text-xs font-semibold text-slate-700 mb-1">
                Encounter Modality *
              </label>
              <select
                id="enc-modality"
                {...register('encounter_type')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="OUTPATIENT">Outpatient Consultation</option>
                <option value="EMERGENCY">Emergency Care</option>
                <option value="INPATIENT">Inpatient Round</option>
                <option value="TELEHEALTH">Telehealth</option>
                <option value="FOLLOW_UP">Follow-up Review</option>
              </select>
            </div>
          </div>
        </FormSection>

        {/* Clinical Complaint & HPI */}
        <FormSection
          title="Clinical Chief Complaint & Presentation"
          description="Primary clinical reasons for seeking medical consultation"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="enc-complaint" className="block text-xs font-semibold text-slate-700 mb-1">
                Chief Complaint *
              </label>
              <input
                id="enc-complaint"
                type="text"
                {...register('chief_complaint')}
                placeholder="e.g. Acute chest discomfort with radiation to left arm for 2 hours..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.chief_complaint && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.chief_complaint.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="enc-hpi" className="block text-xs font-semibold text-slate-700 mb-1">
                History of Present Illness (HPI)
              </label>
              <textarea
                id="enc-hpi"
                rows={4}
                {...register('history_of_present_illness')}
                placeholder="Onset, location, duration, character, aggravating/relieving factors, radiation, timing, severity..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="enc-summary" className="block text-xs font-semibold text-slate-700 mb-1">
                Preliminary Consultation Notes / Impression
              </label>
              <textarea
                id="enc-summary"
                rows={2}
                {...register('clinical_notes_summary')}
                placeholder="General impressions or preliminary findings..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate('/medical-records')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {createMutation.isPending ? 'Starting Consultation...' : 'Create & Open Encounter'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EncounterCreatePage
