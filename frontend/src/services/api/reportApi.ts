import { apiClient } from './client'
import { ReportDateRange, DashboardMetricSummary } from '../../types/reports'

export const reportApi = {
  getDashboardMetrics: async (params?: ReportDateRange): Promise<DashboardMetricSummary> => {
    const res = await apiClient.get<DashboardMetricSummary>('/reports/dashboard/', { params })
    return res.data
  },

  getPatientsReport: async (params?: ReportDateRange): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<Record<string, unknown>>('/reports/patients/', { params })
    return res.data
  },

  getAppointmentsReport: async (params?: ReportDateRange): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<Record<string, unknown>>('/reports/appointments/', { params })
    return res.data
  },

  getInpatientReport: async (params?: ReportDateRange): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<Record<string, unknown>>('/reports/inpatient/', { params })
    return res.data
  },

  getPharmacyReport: async (params?: ReportDateRange): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<Record<string, unknown>>('/reports/pharmacy/', { params })
    return res.data
  },

  getLaboratoryReport: async (params?: ReportDateRange): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<Record<string, unknown>>('/reports/laboratory/', { params })
    return res.data
  },

  getBillingReport: async (params?: ReportDateRange): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<Record<string, unknown>>('/reports/billing/', { params })
    return res.data
  },

  getInsuranceReport: async (params?: ReportDateRange): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<Record<string, unknown>>('/reports/insurance/', { params })
    return res.data
  },
}
