import { apiClient } from './client'
import {
  Hospital,
  HospitalInput,
  Department,
  DepartmentInput,
  Doctor,
  DoctorInput,
  Staff,
  StaffInput,
  UserAccountOption,
  PaginatedResponse,
} from '../../types/hospitals'

// Helper to normalize array or paginated results
function normalizeList<T>(data: PaginatedResponse<T> | T[]): T[] {
  if (Array.isArray(data)) {
    return data
  }
  return data.results || []
}

export const hospitalApi = {
  // Hospital Endpoints
  getHospitals: async (params?: Record<string, unknown>): Promise<Hospital[]> => {
    const res = await apiClient.get<PaginatedResponse<Hospital> | Hospital[]>('/hospitals/', { params })
    return normalizeList(res.data)
  },
  getHospital: async (id: number | string): Promise<Hospital> => {
    const res = await apiClient.get<Hospital>(`/hospitals/${id}/`)
    return res.data
  },
  createHospital: async (data: HospitalInput): Promise<Hospital> => {
    const res = await apiClient.post<Hospital>('/hospitals/', data)
    return res.data
  },
  updateHospital: async (id: number | string, data: Partial<HospitalInput>): Promise<Hospital> => {
    const res = await apiClient.patch<Hospital>(`/hospitals/${id}/`, data)
    return res.data
  },
  deleteHospital: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/hospitals/${id}/`)
  },

  // Department Endpoints
  getDepartments: async (params?: Record<string, unknown>): Promise<Department[]> => {
    const res = await apiClient.get<PaginatedResponse<Department> | Department[]>('/departments/', { params })
    return normalizeList(res.data)
  },
  getDepartment: async (id: number | string): Promise<Department> => {
    const res = await apiClient.get<Department>(`/departments/${id}/`)
    return res.data
  },
  createDepartment: async (data: DepartmentInput): Promise<Department> => {
    const res = await apiClient.post<Department>('/departments/', data)
    return res.data
  },
  updateDepartment: async (id: number | string, data: Partial<DepartmentInput>): Promise<Department> => {
    const res = await apiClient.patch<Department>(`/departments/${id}/`, data)
    return res.data
  },
  deleteDepartment: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/departments/${id}/`)
  },

  // Doctor Endpoints
  getDoctors: async (params?: Record<string, unknown>): Promise<Doctor[]> => {
    const res = await apiClient.get<PaginatedResponse<Doctor> | Doctor[]>('/doctors/', { params })
    return normalizeList(res.data)
  },
  getDoctor: async (id: number | string): Promise<Doctor> => {
    const res = await apiClient.get<Doctor>(`/doctors/${id}/`)
    return res.data
  },
  createDoctor: async (data: DoctorInput): Promise<Doctor> => {
    const res = await apiClient.post<Doctor>('/doctors/', data)
    return res.data
  },
  updateDoctor: async (id: number | string, data: Partial<DoctorInput>): Promise<Doctor> => {
    const res = await apiClient.patch<Doctor>(`/doctors/${id}/`, data)
    return res.data
  },
  deleteDoctor: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/doctors/${id}/`)
  },

  // Staff Endpoints
  getStaffList: async (params?: Record<string, unknown>): Promise<Staff[]> => {
    const res = await apiClient.get<PaginatedResponse<Staff> | Staff[]>('/staff/', { params })
    return normalizeList(res.data)
  },
  getStaff: async (id: number | string): Promise<Staff> => {
    const res = await apiClient.get<Staff>(`/staff/${id}/`)
    return res.data
  },
  createStaff: async (data: StaffInput): Promise<Staff> => {
    const res = await apiClient.post<Staff>('/staff/', data)
    return res.data
  },
  updateStaff: async (id: number | string, data: Partial<StaffInput>): Promise<Staff> => {
    const res = await apiClient.patch<Staff>(`/staff/${id}/`, data)
    return res.data
  },
  deleteStaff: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/staff/${id}/`)
  },

  // User Accounts (for role profile assignment)
  getUsers: async (role?: string): Promise<UserAccountOption[]> => {
    const res = await apiClient.get<UserAccountOption[]>('/accounts/users/', {
      params: role ? { role } : undefined,
    })
    return res.data
  },
}

export default hospitalApi

