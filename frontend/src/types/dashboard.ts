import { UserRole } from '../constants/roles'

export interface DoctorWorkload {
  today_appointments_count: number
  upcoming_appointments_count: number
  completed_appointments_count: number
  cancelled_appointments_count: number
  assigned_active_inpatients_count: number
  encounters_recorded_count: number
}

export interface NurseInpatientOverview {
  total_beds: number
  occupied_beds: number
  available_beds: number
  occupancy_rate_percent: number
  active_inpatients_count: number
  admissions_today_count: number
}

export interface AccountantFinancialSummary {
  currency: string
  total_invoiced: string | number
  total_collected: string | number
  total_refunded: string | number
  net_collected: string | number
  total_outstanding_balance: string | number
  unpaid_invoices_count: number
  claims_submitted_amount: string | number
  claims_approved_amount: string | number
  claims_received_amount: string | number
}

export interface PharmacistSummary {
  total_medicines_count: number
  active_batches_count: number
  low_stock_medicines_count: number
  inventory_valuation: string | number
  dispenses_recorded_count: number
}

export interface LabTechnicianSummary {
  total_lab_orders: number
  urgent_orders_count: number
  results_verified_count: number
  critical_notifications_count: number
  unacknowledged_critical_count: number
}

export interface ReceptionSummary {
  new_patient_registrations: number
  today_appointments_count: number
  pending_checkins_count: number
  admissions_requested_count: number
}

export interface HolisticHospitalMetrics {
  patients?: {
    total_registrations_period: number
  }
  appointments?: {
    total_appointments: number
    confirmed_count: number
    completed_count: number
    cancelled_count: number
    no_show_count: number
  }
  inpatient?: {
    total_admissions_period: number
    active_admissions_count: number
    total_beds: number
    occupied_beds: number
    available_beds: number
    occupancy_rate_percent: number
  }
  pharmacy?: {
    total_medicines: number
    dispenses_recorded: number
  }
  laboratory?: {
    total_lab_orders: number
  }
  billing?: {
    currency: string
    total_invoiced: string | number
    total_collected: string | number
    total_outstanding: string | number
    claims_count: number
    claims_settled_amount: string | number
  }
}

export interface DashboardMetricsResponse {
  user_role: UserRole
  hospital_id?: number | null
  hospital_name?: string
  timestamp: string
  start_date?: string | null
  end_date?: string | null
  message?: string
  workload?: DoctorWorkload
  inpatient_overview?: NurseInpatientOverview
  financial_summary?: AccountantFinancialSummary
  pharmacy_summary?: PharmacistSummary
  laboratory_summary?: LabTechnicianSummary
  reception_summary?: ReceptionSummary
  patients?: { total_registrations_period: number }
  appointments?: {
    total_appointments: number
    confirmed_count: number
    completed_count: number
    cancelled_count: number
    no_show_count: number
  }
  inpatient?: {
    total_admissions_period: number
    active_admissions_count: number
    total_beds: number
    occupied_beds: number
    available_beds: number
    occupancy_rate_percent: number
  }
  pharmacy?: {
    total_medicines: number
    dispenses_recorded: number
  }
  laboratory?: {
    total_lab_orders: number
  }
  billing?: {
    currency: string
    total_invoiced: string | number
    total_collected: string | number
    total_outstanding: string | number
    claims_count: number
    claims_settled_amount: string | number
  }
}

export interface NotificationItem {
  id: number
  title: string
  message: string
  notification_type: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  is_read: boolean
  created_at: string
}

