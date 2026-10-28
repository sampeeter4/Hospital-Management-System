import { apiClient } from './client'
import {
  ClinicalEncounter,
  EncounterInput,
  EncounterFilterParams,
  VitalSigns,
  EncounterDiagnosis,
  ClinicalNote,
} from '../../types/medicalRecords'
import { PaginatedResponse } from '../../types/hospitals'

export const medicalRecordApi = {
  // Get encounters list with filters
  getEncounters: async (params?: EncounterFilterParams): Promise<PaginatedResponse<ClinicalEncounter>> => {
    const response = await apiClient.get<PaginatedResponse<ClinicalEncounter> | ClinicalEncounter[]>(
      '/api/v1/medical-records/encounters/',
      { params }
    )
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

  // Get single clinical encounter details with related vitals, notes, and diagnoses
  getEncounter: async (id: string | number): Promise<ClinicalEncounter> => {
    const response = await apiClient.get<ClinicalEncounter>(`/api/v1/medical-records/encounters/${id}/`)
    return response.data
  },

  // Create new consultation encounter
  createEncounter: async (data: EncounterInput): Promise<ClinicalEncounter> => {
    const response = await apiClient.post<ClinicalEncounter>('/api/v1/medical-records/encounters/', data)
    return response.data
  },

  // Update encounter
  updateEncounter: async (id: string | number, data: Partial<EncounterInput>): Promise<ClinicalEncounter> => {
    const response = await apiClient.patch<ClinicalEncounter>(`/api/v1/medical-records/encounters/${id}/`, data)
    return response.data
  },

  // Close clinical encounter
  closeEncounter: async (id: string | number): Promise<ClinicalEncounter> => {
    const response = await apiClient.post<ClinicalEncounter>(`/api/v1/medical-records/encounters/${id}/close/`)
    return response.data
  },

  // Record vital signs
  createVitalSigns: async (data: Partial<VitalSigns>): Promise<VitalSigns> => {
    const response = await apiClient.post<VitalSigns>('/api/v1/medical-records/vitals/', data)
    return response.data
  },

  // Record diagnosis
  createDiagnosis: async (data: Partial<EncounterDiagnosis>): Promise<EncounterDiagnosis> => {
    const response = await apiClient.post<EncounterDiagnosis>('/api/v1/medical-records/diagnoses/', data)
    return response.data
  },

  // Record clinical SOAP note
  createClinicalNote: async (data: Partial<ClinicalNote>): Promise<ClinicalNote> => {
    const response = await apiClient.post<ClinicalNote>('/api/v1/medical-records/notes/', data)
    return response.data
  },

  // Longitudinal patient timeline
  getPatientTimeline: async (patientId: string | number) => {
    const response = await apiClient.get(`/api/v1/medical-records/patients/${patientId}/timeline/`)
    return response.data
  },
}

