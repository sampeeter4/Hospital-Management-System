import { apiClient } from './client'
import {
  Appointment,
  AppointmentInput,
  AppointmentFilterParams,
  AvailableSlot,
  DoctorAvailability,
  AppointmentStatusHistory,
} from '../../types/appointments'
import { PaginatedResponse } from '../../types/hospitals'

export const appointmentApi = {
  // Get all appointments with filters & pagination
  getAppointments: async (params?: AppointmentFilterParams): Promise<PaginatedResponse<Appointment>> => {
    const response = await apiClient.get<PaginatedResponse<Appointment> | Appointment[]>('/api/v1/appointments/', {
      params,
    })
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      }
    }
    return response.data
  },

  // Get single appointment details
  getAppointment: async (id: string | number): Promise<Appointment> => {
    const response = await apiClient.get<Appointment>(`/api/v1/appointments/${id}/`)
    return response.data
  },

  // Create new appointment
  createAppointment: async (data: AppointmentInput): Promise<Appointment> => {
    const response = await apiClient.post<Appointment>('/api/v1/appointments/', data)
    return response.data
  },

  // Update appointment notes / visit details
  updateAppointment: async (id: string | number, data: Partial<AppointmentInput>): Promise<Appointment> => {
    const response = await apiClient.patch<Appointment>(`/api/v1/appointments/${id}/`, data)
    return response.data
  },

  // Delete appointment
  deleteAppointment: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/api/v1/appointments/${id}/`)
  },

  // Query real-time available time slots for doctor & date
  getAvailableSlots: async (doctorId: number | string, date: string): Promise<AvailableSlot[]> => {
    const response = await apiClient.get<AvailableSlot[]>('/api/v1/appointments/available-slots/', {
      params: { doctor_id: doctorId, date },
    })
    return response.data
  },

  // Clinical & Reception status transition actions:
  confirmAppointment: async (id: string | number): Promise<Appointment> => {
    const response = await apiClient.post<Appointment>(`/api/v1/appointments/${id}/confirm/`)
    return response.data
  },

  checkInAppointment: async (id: string | number): Promise<Appointment> => {
    const response = await apiClient.post<Appointment>(`/api/v1/appointments/${id}/check-in/`)
    return response.data
  },

  startAppointment: async (id: string | number): Promise<Appointment> => {
    const response = await apiClient.post<Appointment>(`/api/v1/appointments/${id}/start/`)
    return response.data
  },

  completeAppointment: async (id: string | number): Promise<Appointment> => {
    const response = await apiClient.post<Appointment>(`/api/v1/appointments/${id}/complete/`)
    return response.data
  },

  cancelAppointment: async (id: string | number, reason: string): Promise<Appointment> => {
    const response = await apiClient.post<Appointment>(`/api/v1/appointments/${id}/cancel/`, {
      cancellation_reason: reason,
    })
    return response.data
  },

  rescheduleAppointment: async (
    id: string | number,
    data: { appointment_date: string; start_time: string; end_time: string }
  ): Promise<Appointment> => {
    const response = await apiClient.post<Appointment>(`/api/v1/appointments/${id}/reschedule/`, data)
    return response.data
  },

  // Audit status history
  getAppointmentHistory: async (id: string | number): Promise<AppointmentStatusHistory[]> => {
    const response = await apiClient.get<AppointmentStatusHistory[] | PaginatedResponse<AppointmentStatusHistory>>(
      `/api/v1/appointments/${id}/history/`
    )
    if (Array.isArray(response.data)) {
      return response.data
    }
    return (response.data as PaginatedResponse<AppointmentStatusHistory>).results || []
  },

  // Doctor availability
  getDoctorAvailabilities: async (doctorId?: number | string): Promise<DoctorAvailability[]> => {
    const response = await apiClient.get<PaginatedResponse<DoctorAvailability> | DoctorAvailability[]>(
      '/api/v1/doctor-availability/',
      { params: doctorId ? { doctor: doctorId } : undefined }
    )
    if (Array.isArray(response.data)) {
      return response.data
    }
    return response.data.results || []
  },
}
