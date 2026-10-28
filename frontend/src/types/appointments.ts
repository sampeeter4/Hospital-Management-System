export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export type AppointmentType =
  | 'IN_PERSON'
  | 'TELEHEALTH'
  | 'FOLLOW_UP'
  | 'EMERGENCY'

export interface Appointment {
  id: number
  appointment_reference: string
  patient: number
  patient_name: string
  patient_mrn: string
  doctor: number
  doctor_name: string
  doctor_id_code: string
  hospital: number
  hospital_name: string
  department: number
  department_name: string
  appointment_date: string
  start_time: string
  end_time: string
  appointment_type: AppointmentType
  status: AppointmentStatus
  reason_for_visit?: string
  patient_notes?: string
  staff_notes?: string
  cancellation_reason?: string
  cancelled_at?: string | null
  cancelled_by?: number | null
  booked_by?: number | null
  booked_by_username?: string
  created_at: string
  updated_at: string
}

export interface AppointmentInput {
  patient?: number
  doctor: number
  hospital?: number
  department?: number
  appointment_date: string
  start_time: string
  end_time: string
  appointment_type?: AppointmentType
  reason_for_visit?: string
  patient_notes?: string
  staff_notes?: string
}

export interface AvailableSlot {
  start_time: string
  end_time: string
  slot_duration: number
}

export interface DoctorAvailability {
  id: number
  doctor: number
  doctor_name: string
  day_of_week: number
  day_name: string
  start_time: string
  end_time: string
  slot_duration: number
  is_active: boolean
  effective_start_date?: string | null
  effective_end_date?: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentStatusHistory {
  id: number
  appointment: number
  previous_status: AppointmentStatus
  new_status: AppointmentStatus
  changed_by: number
  changed_by_username: string
  reason: string
  created_at: string
}

export interface AppointmentFilterParams {
  doctor?: number | string
  patient?: number | string
  hospital?: number | string
  department?: number | string
  appointment_date?: string
  status?: AppointmentStatus | ''
  appointment_type?: AppointmentType | ''
  search?: string
  page?: number
  page_size?: number
}
