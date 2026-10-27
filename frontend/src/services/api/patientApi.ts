import { apiClient } from './client'
import { Patient, PatientInput, PatientFilterParams } from '../../types/patients'
import { PaginatedResponse } from '../../types/hospitals'

export const patientApi = {
  // Get all patients with filtering & pagination
  getPatients: async (params?: PatientFilterParams): Promise<PaginatedResponse<Patient>> => {
    const response = await apiClient.get<PaginatedResponse<Patient> | Patient[]>('/api/v1/patients/', { params })
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

  // Get single patient record by ID
  getPatient: async (id: string | number): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`/api/v1/patients/${id}/`)
    return response.data
  },

  // Get current authenticated patient's profile (self-service)
  getPatientMe: async (): Promise<Patient> => {
    const response = await apiClient.get<Patient>('/api/v1/patients/me/')
    return response.data
  },

  // Register / create new patient record
  createPatient: async (data: PatientInput): Promise<Patient> => {
    const response = await apiClient.post<Patient>('/api/v1/patients/', data)
    return response.data
  },

  // Update existing patient record (admin/receptionist)
  updatePatient: async (id: string | number, data: Partial<PatientInput>): Promise<Patient> => {
    const response = await apiClient.patch<Patient>(`/api/v1/patients/${id}/`, data)
    return response.data
  },

  // Self-update for current patient profile
  updatePatientMe: async (data: Partial<PatientInput>): Promise<Patient> => {
    const response = await apiClient.patch<Patient>('/api/v1/patients/me/', data)
    return response.data
  },

  // Remove / delete patient record
  deletePatient: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/api/v1/patients/${id}/`)
  },

  // Linked module helpers for Patient 360 View:
  getPatientAppointments: async (patientId: string | number) => {
    const response = await apiClient.get('/api/v1/appointments/', { params: { patient: patientId } })
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  getPatientTimeline: async (patientId: string | number) => {
    const response = await apiClient.get(`/api/v1/medical-records/patients/${patientId}/timeline/`)
    return response.data
  },

  getPatientLabResults: async (patientId: string | number) => {
    const response = await apiClient.get(`/api/v1/laboratory/patients/${patientId}/results/`)
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  getPatientInvoices: async (patientId: string | number) => {
    const response = await apiClient.get('/api/v1/billing/invoices/', { params: { patient: patientId } })
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  getPatientPrescriptions: async (patientId: string | number) => {
    const response = await apiClient.get('/api/v1/pharmacy/prescriptions/', { params: { patient: patientId } })
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  getPatientAdmissions: async (patientId: string | number) => {
    const response = await apiClient.get('/api/v1/inpatient/admissions/', { params: { patient: patientId } })
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },
}
