import { apiClient } from './client'
import {
  LabOrder,
  LabOrderInput,
  LabOrderFilterParams,
  LabTest,
  LabSpecimen,
  LabResult,
  LabResultEntryInput,
  LabResultFilterParams,
} from '../../types/laboratory'
import { PaginatedResponse } from '../../types'

export const laboratoryApi = {
  // Orders
  getLabOrders: async (params?: LabOrderFilterParams): Promise<PaginatedResponse<LabOrder>> => {
    const res = await apiClient.get<PaginatedResponse<LabOrder>>('/laboratory/orders/', {
      params,
    })
    return res.data
  },

  getLabOrder: async (id: number): Promise<LabOrder> => {
    const res = await apiClient.get<LabOrder>(`/laboratory/orders/${id}/`)
    return res.data
  },

  createLabOrder: async (data: LabOrderInput): Promise<LabOrder> => {
    const res = await apiClient.post<LabOrder>('/laboratory/orders/', data)
    return res.data
  },

  cancelLabOrder: async (id: number, reason: string): Promise<LabOrder> => {
    const res = await apiClient.post<LabOrder>(`/laboratory/orders/${id}/cancel/`, {
      reason,
    })
    return res.data
  },

  // Catalogue / Tests
  getLabTests: async (params?: {
    category?: string
    specimen_type?: string
    is_active?: boolean
    search?: string
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<LabTest>> => {
    const res = await apiClient.get<PaginatedResponse<LabTest>>('/laboratory/tests/', {
      params,
    })
    return res.data
  },

  getLabTest: async (id: number): Promise<LabTest> => {
    const res = await apiClient.get<LabTest>(`/laboratory/tests/${id}/`)
    return res.data
  },

  // Specimens
  getLabSpecimens: async (params?: {
    status?: string
    specimen_type?: string
    search?: string
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<LabSpecimen>> => {
    const res = await apiClient.get<PaginatedResponse<LabSpecimen>>('/laboratory/specimens/', {
      params,
    })
    return res.data
  },

  collectSpecimen: async (id: number, collectionLocation?: string): Promise<LabSpecimen> => {
    const res = await apiClient.post<LabSpecimen>(`/laboratory/specimens/${id}/collect/`, {
      collection_location: collectionLocation,
    })
    return res.data
  },

  receiveSpecimen: async (id: number): Promise<LabSpecimen> => {
    const res = await apiClient.post<LabSpecimen>(`/laboratory/specimens/${id}/receive/`, {})
    return res.data
  },

  rejectSpecimen: async (id: number, rejectionReason: string): Promise<LabSpecimen> => {
    const res = await apiClient.post<LabSpecimen>(`/laboratory/specimens/${id}/reject/`, {
      rejection_reason: rejectionReason,
    })
    return res.data
  },

  // Results
  getLabResults: async (params?: LabResultFilterParams): Promise<PaginatedResponse<LabResult>> => {
    const res = await apiClient.get<PaginatedResponse<LabResult>>('/laboratory/results/', {
      params,
    })
    return res.data
  },

  getLabResult: async (id: number): Promise<LabResult> => {
    const res = await apiClient.get<LabResult>(`/laboratory/results/${id}/`)
    return res.data
  },

  enterLabResult: async (data: LabResultEntryInput): Promise<LabResult> => {
    const res = await apiClient.post<LabResult>('/laboratory/results/enter/', data)
    return res.data
  },

  verifyLabResult: async (id: number): Promise<LabResult> => {
    const res = await apiClient.post<LabResult>(`/laboratory/results/${id}/verify/`, {})
    return res.data
  },

  correctLabResult: async (
    id: number,
    data: {
      correction_reason: string
      corrections: { parameter_id: number; new_numeric_value?: number; new_text_value?: string }[]
    }
  ): Promise<LabResult> => {
    const res = await apiClient.post<LabResult>(`/laboratory/results/${id}/correct/`, data)
    return res.data
  },

  getPatientLabResults: async (patientId: number): Promise<LabResult[]> => {
    const res = await apiClient.get<LabResult[]>(`/laboratory/patients/${patientId}/results/`)
    return res.data
  },
}

