export interface DashboardMetricSummary {
  total_patients?: number
  new_patients_today?: number
  total_appointments?: number
  pending_appointments?: number
  completed_appointments?: number
  total_inpatient_admissions?: number
  active_inpatient_admissions?: number
  bed_occupancy_rate_percent?: number
  prescriptions_issued?: number
  prescriptions_dispensed?: number
  lab_orders_count?: number
  critical_lab_results?: number
  total_invoiced_amount?: number
  total_collected_amount?: number
  total_outstanding_amount?: number
  date_range?: {
    start_date: string
    end_date: string
  }
}

export interface ReportDateRange {
  start_date?: string
  end_date?: string
  hospital?: number
}
