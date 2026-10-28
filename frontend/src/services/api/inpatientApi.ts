import { apiClient } from './client'
import {
  Ward,
  Room,
  Bed,
  Admission,
  AdmissionInput,
  DischargeInput,
  BedAssignment,
  OccupancyReport,
  AdmissionFilterParams,
  BedFilterParams,
  BedStatus,
} from '../../types/inpatient'
import { PaginatedResponse } from '../../types'

export const inpatientApi = {
  // Wards
  getWards: async (params?: {
    hospital?: number
    department?: number
    ward_type?: string
    is_active?: boolean
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<Ward>> => {
    const res = await apiClient.get<PaginatedResponse<Ward>>('/inpatient/wards/', { params })
    return res.data
  },

  getWard: async (id: number): Promise<Ward> => {
    const res = await apiClient.get<Ward>(`/inpatient/wards/${id}/`)
    return res.data
  },

  getWardOccupancy: async (wardId: number): Promise<OccupancyReport> => {
    const res = await apiClient.get<OccupancyReport>(`/inpatient/wards/${wardId}/occupancy/`)
    return res.data
  },

  // Rooms
  getRooms: async (params?: {
    ward?: number
    is_active?: boolean
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<Room>> => {
    const res = await apiClient.get<PaginatedResponse<Room>>('/inpatient/rooms/', { params })
    return res.data
  },

  // Beds
  getBeds: async (params?: BedFilterParams): Promise<PaginatedResponse<Bed>> => {
    const res = await apiClient.get<PaginatedResponse<Bed>>('/inpatient/beds/', { params })
    return res.data
  },

  getAvailableBeds: async (params?: {
    hospital?: number
    ward?: number
    room?: number
  }): Promise<PaginatedResponse<Bed> | Bed[]> => {
    const res = await apiClient.get<PaginatedResponse<Bed> | Bed[]>('/inpatient/beds/available/', {
      params,
    })
    return res.data
  },

  updateBedStatus: async (id: number, newStatus: BedStatus, notes?: string): Promise<Bed> => {
    const res = await apiClient.post<Bed>(`/inpatient/beds/${id}/update-status/`, {
      status: newStatus,
      notes: notes || '',
    })
    return res.data
  },

  // Admissions
  getAdmissions: async (params?: AdmissionFilterParams): Promise<PaginatedResponse<Admission>> => {
    const res = await apiClient.get<PaginatedResponse<Admission>>('/inpatient/admissions/', {
      params,
    })
    return res.data
  },

  getAdmission: async (id: number): Promise<Admission> => {
    const res = await apiClient.get<Admission>(`/inpatient/admissions/${id}/`)
    return res.data
  },

  createAdmission: async (data: AdmissionInput): Promise<Admission> => {
    const res = await apiClient.post<Admission>('/inpatient/admissions/', data)
    return res.data
  },

  admitPatient: async (id: number, bedId: number, reason?: string): Promise<Admission> => {
    const res = await apiClient.post<Admission>(`/inpatient/admissions/${id}/admit/`, {
      bed_id: bedId,
      reason: reason || 'Inpatient admission bed assignment',
    })
    return res.data
  },

  transferPatient: async (
    id: number,
    destinationBedId: number,
    reason: string
  ): Promise<BedAssignment> => {
    const res = await apiClient.post<BedAssignment>(`/inpatient/admissions/${id}/transfer/`, {
      destination_bed_id: destinationBedId,
      reason,
    })
    return res.data
  },

  dischargePatient: async (id: number, data: DischargeInput): Promise<Admission> => {
    const res = await apiClient.post<Admission>(`/inpatient/admissions/${id}/discharge/`, data)
    return res.data
  },

  cancelAdmission: async (id: number, reason: string): Promise<Admission> => {
    const res = await apiClient.post<Admission>(`/inpatient/admissions/${id}/cancel/`, {
      reason,
    })
    return res.data
  },

  getAdmissionBedHistory: async (id: number): Promise<BedAssignment[]> => {
    const res = await apiClient.get<BedAssignment[]>(`/inpatient/admissions/${id}/bed-history/`)
    return res.data
  },

  getOccupancyReport: async (hospitalId?: number): Promise<OccupancyReport> => {
    const res = await apiClient.get<OccupancyReport>('/inpatient/occupancy/', {
      params: hospitalId ? { hospital: hospitalId } : undefined,
    })
    return res.data
  },
}
