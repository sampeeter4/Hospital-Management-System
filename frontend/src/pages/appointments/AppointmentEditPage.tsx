import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentApi } from '../../services/api/appointmentApi'
import { Appointment, AppointmentInput } from '../../types/appointments'
import { PageHeader, FormSection } from '../../components/ui'

const appointmentEditSchema = z.object({
  appointment_type: z.enum(['IN_PERSON', 'TELEHEALTH', 'FOLLOW_UP', 'EMERGENCY']),
  reason_for_visit: z.string().min(3, 'Reason for visit is required'),
  patient_notes: z.string().optional(),
  staff_notes: z.string().optional(),
})

type AppointmentEditFormData = z.infer<typeof appointmentEditSchema>

export const AppointmentEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch Appointment
  const { data: appointment, isLoading } = useQuery<Appointment, Error>({
    queryKey: ['appointment', id],
    queryFn: () => appointmentApi.getAppointment(id!),
    enabled: !!id,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentEditFormData>({
    resolver: zodResolver(appointmentEditSchema),
    defaultValues: {
      appointment_type: 'IN_PERSON',
      reason_for_visit: '',
      patient_notes: '',
      staff_notes: '',
    },
  })

  useEffect(() => {
    if (appointment) {
      reset({
        appointment_type: appointment.appointment_type,
        reason_for_visit: appointment.reason_for_visit || '',
        patient_notes: appointment.patient_notes || '',
        staff_notes: appointment.staff_notes || '',
      })
    }
  }, [appointment, reset])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AppointmentInput>) =>
      appointmentApi.updateAppointment(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      navigate(`/appointments/${id}`)
    },
  })

  const onSubmit = (formData: AppointmentEditFormData) => {
    updateMutation.mutate(formData)
  }

  if (isLoading) {
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
        title={`Edit Appointment ${appointment?.appointment_reference || ''}`}
        subtitle={`Scheduled on ${appointment?.appointment_date} with Dr. ${appointment?.doctor_name}`}
        backTo={`/appointments/${id}`}
        backLabel="Back to Appointment"
      />

      {updateMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to update appointment: {updateMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="Clinical Visit Details & Notes"
          description="Update chief complaint, appointment modality, and clinical notes"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-apt-type" className="block text-xs font-semibold text-slate-700 mb-1">
                  Appointment Modality *
                </label>
                <select
                  id="edit-apt-type"
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
                <label htmlFor="edit-apt-reason" className="block text-xs font-semibold text-slate-700 mb-1">
                  Chief Complaint / Reason for Visit *
                </label>
                <input
                  id="edit-apt-reason"
                  type="text"
                  {...register('reason_for_visit')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.reason_for_visit && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.reason_for_visit.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="edit-apt-pat-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Stated Instructions & Symptoms Description
              </label>
              <textarea
                id="edit-apt-pat-notes"
                rows={3}
                {...register('patient_notes')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="edit-apt-stf-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Staff / Reception Notes (Confidential)
              </label>
              <textarea
                id="edit-apt-stf-notes"
                rows={2}
                {...register('staff_notes')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate(`/appointments/${id}`)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Appointment Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AppointmentEditPage
