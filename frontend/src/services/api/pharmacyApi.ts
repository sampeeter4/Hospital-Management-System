import { apiClient } from './client'
import {
  Prescription,
  PrescriptionInput,
  PrescriptionFilterParams,
  Medicine,
  AggregatedStock,
  MedicineBatch,
} from '../../types/pharmacy'
import { PaginatedResponse } from '../../types/hospitals'

export const pharmacyApi = {
  // Get prescriptions list
  getPrescriptions: async (params?: PrescriptionFilterParams): Promise<PaginatedResponse<Prescription>> => {
    const response = await apiClient.get<PaginatedResponse<Prescription> | Prescription[]>(
      '/api/v1/pharmacy/prescriptions/',
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

  // Get single prescription
  getPrescription: async (id: string | number): Promise<Prescription> => {
    const response = await apiClient.get<Prescription>(`/api/v1/pharmacy/prescriptions/${id}/`)
    return response.data
  },

  // Create new prescription
  createPrescription: async (data: PrescriptionInput): Promise<Prescription> => {
    const response = await apiClient.post<Prescription>('/api/v1/pharmacy/prescriptions/', data)
    return response.data
  },

  // Issue prescription (transitions status to ISSUED)
  issuePrescription: async (id: string | number): Promise<Prescription> => {
    const response = await apiClient.post<Prescription>(`/api/v1/pharmacy/prescriptions/${id}/issue/`)
    return response.data
  },

  // Cancel prescription
  cancelPrescription: async (id: string | number, reason: string): Promise<Prescription> => {
    const response = await apiClient.post<Prescription>(`/api/v1/pharmacy/prescriptions/${id}/cancel/`, {
      cancellation_reason: reason,
    })
    return response.data
  },

  // Medicines catalogue
  getMedicines: async (params?: { search?: string; is_active?: boolean }): Promise<PaginatedResponse<Medicine>> => {
    const response = await apiClient.get<PaginatedResponse<Medicine> | Medicine[]>('/api/v1/pharmacy/medicines/', {
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

  // Stock inventory queries
  getAggregatedStock: async (params?: { medicine_id?: number; location_id?: number }): Promise<AggregatedStock[]> => {
    const response = await apiClient.get<AggregatedStock[]>('/api/v1/pharmacy/stock/', { params })
    return response.data
  },

  getLowStock: async (): Promise<Medicine[]> => {
    const response = await apiClient.get<Medicine[] | PaginatedResponse<Medicine>>('/api/v1/pharmacy/low-stock/')
    if (Array.isArray(response.data)) {
      return response.data
    }
    return (response.data as PaginatedResponse<Medicine>).results || []
  },

  getExpiringBatches: async (days: number = 30): Promise<MedicineBatch[]> => {
    const response = await apiClient.get<MedicineBatch[]>('/api/v1/pharmacy/expiring/', {
      params: { days },
    })
    return response.data
  },
}
