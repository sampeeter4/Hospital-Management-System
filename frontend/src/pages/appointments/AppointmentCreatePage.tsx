import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Check, AlertCircle } from 'lucide-react'
import { appointmentApi } from '../../services/api/appointmentApi'
import { patientApi } from '../../services/api/patientApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import { AppointmentInput, AvailableSlot } from '../../types/appointments'
import { Doctor, Department, Hospital } from '../../types/hospitals'
import { Patient } from '../../types/patients'
import { PageHeader, FormSection } from '../../components/ui'

const appointmentSchema = z.object({
  patient: z.number().min(1, 'Please select a patient'),
  hospital: z.number().min(1, 'Please select a hospital facility'),
  department: z.number().min(1, 'Please select a department'),
  doctor: z.number().min(1, 'Please select a doctor'),
  appointment_date: z.string().min(10, 'Appointment date is required'),
  start_time: z.string().min(4, 'Please select an available time slot'),
  end_time: z.string().min(4, 'Please select an available time slot'),
  appointment_type: z.enum(['IN_PERSON', 'TELEHEALTH', 'FOLLOW_UP', 'EMERGENCY']),
  reason_for_visit: z.string().min(3, 'Reason for visit / chief complaint is required'),
  patient_notes: z.string().optional(),
  staff_notes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

export const AppointmentCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const preselectedPatientId = searchParams.get('patient')

  // Local state for dynamic slots fetching
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)
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

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient: preselectedPatientId ? Number(preselectedPatientId) : undefined,
      hospital: undefined,
      department: undefined,
      doctor: undefined,
      appointment_date: selectedDate,
      start_time: '',
      end_time: '',
      appointment_type: 'IN_PERSON',
      reason_for_visit: '',
      patient_notes: '',
      staff_notes: '',
    },
  })

  // Fetch Available Slots when doctor & date are active
  const {
    data: availableSlots = [],
    isLoading: isLoadingSlots,
  } = useQuery<AvailableSlot[], Error>({
    queryKey: ['available-slots', selectedDoctorId, selectedDate],
    queryFn: () => appointmentApi.getAvailableSlots(selectedDoctorId!, selectedDate),
    enabled: !!selectedDoctorId && !!selectedDate,
  })

  const handleDoctorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : undefined
    setSelectedDoctorId(val)
    setSelectedSlotIndex(null)
    setValue('start_time', '')
    setValue('end_time', '')
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSelectedDate(val)
    setSelectedSlotIndex(null)
    setValue('start_time', '')
    setValue('end_time', '')
  }

  const createMutation = useMutation({
    mutationFn: (data: AppointmentInput) => appointmentApi.createAppointment(data),
    onSuccess: (newApt) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      navigate(`/appointments/${newApt.id}`)
    },
  })

  const handleSelectSlot = (slot: AvailableSlot, index: number) => {
    setSelectedSlotIndex(index)
    setValue('start_time', slot.start_time, { shouldValidate: true })
    setValue('end_time', slot.end_time, { shouldValidate: true })
  }

  const onSubmit = (formData: AppointmentFormData) => {
    createMutation.mutate({
      ...formData,
      patient: Number(formData.patient),
      hospital: Number(formData.hospital),
      department: Number(formData.department),
      doctor: Number(formData.doctor),
    })
  }

  const selectedSlot = selectedSlotIndex !== null ? availableSlots[selectedSlotIndex] : null

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Schedule New Appointment"
        subtitle="Book physician consultation slot, check availability schedule, and record reason for visit"
        backTo="/appointments"
        backLabel="Back to Appointments"
      />

      {createMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to book appointment: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Patient Selection */}
        <FormSection
          title="1. Patient Selection"
          description="Identify the patient booking this appointment"
        >
          <div>
            <label htmlFor="apt-patient" className="block text-xs font-semibold text-slate-700 mb-1">
              Select Patient *
            </label>
            <select
              id="apt-patient"
              {...register('patient', { valueAsNumber: true })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">Choose Patient File...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patient_name || p.username} — MRN: {p.mrn} ({p.phone || 'No phone'})
                </option>
              ))}
            </select>
            {errors.patient && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.patient.message}</p>
            )}
          </div>
        </FormSection>

        {/* Step 2: Facility, Department & Doctor */}
        <FormSection
          title="2. Physician & Clinical Department"
          description="Choose hospital, department specialty, and attending physician"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="apt-hosp" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Facility *
              </label>
              <select
                id="apt-hosp"
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
              <label htmlFor="apt-dept" className="block text-xs font-semibold text-slate-700 mb-1">
                Department Specialty *
              </label>
              <select
                id="apt-dept"
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
              <label htmlFor="apt-doc" className="block text-xs font-semibold text-slate-700 mb-1">
                Attending Physician *
              </label>
              <select
                id="apt-doc"
                {...register('doctor', {
                  valueAsNumber: true,
                  onChange: handleDoctorChange,
                })}
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
          </div>
        </FormSection>

        {/* Step 3: Date & Live Slot Picker */}
        <FormSection
          title="3. Date & Available Consultation Slots"
          description="Check live doctor availability schedule and pick an open time window"
        >
          <div className="space-y-4">
            <div className="max-w-xs">
              <label htmlFor="apt-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Date *
              </label>
              <input
                id="apt-date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                {...register('appointment_date', {
                  onChange: handleDateChange,
                })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {errors.appointment_date && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.appointment_date.message}</p>
              )}
            </div>

            {/* Time Slots Area */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Available Time Slots for Selected Date:
              </span>

              {!selectedDoctorId ? (
                <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  Please select an attending physician above to view available time slots.
                </div>
              ) : isLoadingSlots ? (
                <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-spin text-blue-600" />
                  Checking doctor availability and calculating slots...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  No open slots found for Dr. on {selectedDate}. The doctor may not be scheduled or all slots are booked. Please pick another date.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {availableSlots.map((slot, idx) => {
                    const isSelected = selectedSlotIndex === idx
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSlot(slot, idx)}
                        className={`p-2 rounded-md border text-xs font-mono font-medium transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                      >
                        <span className="text-[11px]">{slot.start_time.slice(0, 5)}</span>
                        <span className="text-[10px] opacity-75">- {slot.end_time.slice(0, 5)}</span>
                        {isSelected && <Check className="w-3 h-3 mt-1" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {errors.start_time && (
                <p className="text-[11px] text-rose-600 mt-2">
                  Please select one of the available time slots above.
                </p>
              )}

              {selectedSlot && (
                <div className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Selected slot: {selectedSlot.start_time.slice(0, 5)} to {selectedSlot.end_time.slice(0, 5)}
                </div>
              )}
            </div>
          </div>
        </FormSection>

        {/* Step 4: Appointment Details & Clinical Reason */}
        <FormSection
          title="4. Visit Details & Chief Complaint"
          description="Appointment modality, reason for visit, and clinical instructions"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="apt-type" className="block text-xs font-semibold text-slate-700 mb-1">
                  Appointment Modality *
                </label>
                <select
                  id="apt-type"
                  {...register('appointment_type')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="IN_PERSON">In-Person Consultation</option>
                  <option value="TELEHEALTH">Telehealth / Video Call</option>
                  <option value="FOLLOW_UP">Follow-up Review</option>
                  <option value="EMERGENCY">Emergency OPD</option>
                </select>
              </div>

              <div>
                <label htmlFor="apt-reason" className="block text-xs font-semibold text-slate-700 mb-1">
                  Chief Complaint / Reason for Visit *
                </label>
                <input
                  id="apt-reason"
                  type="text"
                  {...register('reason_for_visit')}
                  placeholder="e.g. Chronic knee pain, elevated blood pressure checkup..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.reason_for_visit && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.reason_for_visit.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="apt-pat-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Instructions & Symptoms Description (Optional)
              </label>
              <textarea
                id="apt-pat-notes"
                rows={2}
                {...register('patient_notes')}
                placeholder="Patient description of onset, pain scale, or previous medications taken..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="apt-stf-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Staff / Reception Notes (Confidential)
              </label>
              <input
                id="apt-stf-notes"
                type="text"
                {...register('staff_notes')}
                placeholder="e.g. VIP patient, requires wheelchair assistance..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate('/appointments')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {createMutation.isPending ? 'Booking Appointment...' : 'Confirm & Schedule Appointment'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AppointmentCreatePage
