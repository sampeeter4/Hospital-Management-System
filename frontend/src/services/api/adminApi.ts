import apiClient from './client'
import {
  UserAccount,
  RegisterUserRequest,
  SystemHealthResponse,
  ReportAuditEntry,
  ClinicalBillingAuditEntry,
} from '../../types/admin'
import { PaginatedResponse } from '../../types'

export const adminApi = {
  /**
   * Fetches user accounts with optional role filtering
   * GET /api/v1/accounts/users/?role=...
   */
  async getUsers(params?: { role?: string }): Promise<UserAccount[]> {
    const response = await apiClient.get<UserAccount[] | PaginatedResponse<UserAccount>>('/accounts/users/', {
      params,
    })
    if (Array.isArray(response.data)) {
      return response.data
    }
    return response.data?.results || []
  },

  /**
   * Provisions a new user account
   * POST /api/v1/accounts/register/
   */
  async createUser(payload: RegisterUserRequest): Promise<{ message: string; user: UserAccount }> {
    const response = await apiClient.post<{ message: string; user: UserAccount }>('/accounts/register/', payload)
    return response.data
  },

  /**
   * Fetches real-time system and database health status
   * GET /api/v1/health/
   */
  async getHealthStatus(): Promise<SystemHealthResponse> {
    const response = await apiClient.get<SystemHealthResponse>('/health/')
    return response.data
  },

  /**
   * Fetches system report and data export audit logs
   * GET /api/v1/reports/audit-logs/
   */
  async getReportAuditLogs(): Promise<ReportAuditEntry[]> {
    const response = await apiClient.get<ReportAuditEntry[] | PaginatedResponse<ReportAuditEntry>>(
      '/reports/audit-logs/'
    )
    if (Array.isArray(response.data)) {
      return response.data
    }
    return response.data?.results || []
  },

  /**
   * Fetches billing and transaction immutable audit logs
   * GET /api/v1/billing/audit-logs/
   */
  async getBillingAuditLogs(): Promise<ClinicalBillingAuditEntry[]> {
    const response = await apiClient.get<ClinicalBillingAuditEntry[] | PaginatedResponse<ClinicalBillingAuditEntry>>(
      '/billing/audit-logs/'
    )
    if (Array.isArray(response.data)) {
      return response.data
    }
    return response.data?.results || []
  },

  /**
   * Fetches inpatient bed and admission immutable audit logs
   * GET /api/v1/inpatient/audit-logs/
   */
  async getInpatientAuditLogs(): Promise<ClinicalBillingAuditEntry[]> {
    const response = await apiClient.get<ClinicalBillingAuditEntry[] | PaginatedResponse<ClinicalBillingAuditEntry>>(
      '/inpatient/audit-logs/'
    )
    if (Array.isArray(response.data)) {
      return response.data
    }
    return response.data?.results || []
  },
}

export default adminApi

