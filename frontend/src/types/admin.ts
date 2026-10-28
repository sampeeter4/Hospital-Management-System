import { UserRole } from '../constants/roles'

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

export interface RegisterUserRequest {
  username: string
  email: string
  password: string
  password_confirm: string
  phone?: string
  role?: UserRole
}

export interface UserAccount {
  id: number
  username: string
  email: string
  phone: string
  role: UserRole
  is_verified: boolean
  date_joined: string
  last_login: string | null
}

export interface SystemHealthResponse {
  status: 'success' | 'unhealthy'
  message: string
  version: string
  services: {
    database: 'healthy' | 'unhealthy'
    [key: string]: string
  }
}

export interface ReportAuditEntry {
  id: number
  username: string
  report_type: string
  action: string
  hospital_name: string
  parameters: Record<string, unknown> | null
  ip_address: string
  records_count: number
  timestamp: string
}

export interface ClinicalBillingAuditEntry {
  id: number
  resource_type: string
  resource_id: number | string
  action: string
  user: number | null
  user_name: string | null
  user_role: string
  patient: number | null
  patient_mrn: string | null
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

