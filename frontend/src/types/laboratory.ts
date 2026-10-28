export type LabOrderPriority = 'ROUTINE' | 'URGENT' | 'STAT'

export type LabOrderStatus =
  | 'ORDERED'
  | 'COLLECTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'

export type LabOrderItemStatus =
  | 'PENDING'
  | 'COLLECTED'
  | 'IN_ANALYSIS'
  | 'VERIFIED'
  | 'CANCELLED'

export type LabSpecimenStatus =
  | 'PENDING_COLLECTION'
  | 'COLLECTED'
  | 'RECEIVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED'

export type LabResultStatus =
  | 'PRELIMINARY'
  | 'VERIFIED'
  | 'CORRECTED'
  | 'CANCELLED'

export type AbnormalityFlag =
  | 'NORMAL'
  | 'LOW'
  | 'HIGH'
  | 'ABNORMAL'
  | 'CRITICAL_LOW'
  | 'CRITICAL_HIGH'

export interface LabReferenceRange {
  id: number
  parameter: number
  parameter_code: string
  parameter_name: string
  gender: string
  gender_display?: string
  age_min_years?: number | null
  age_max_years?: number | null
  min_normal_value?: number | null
  max_normal_value?: number | null
  critical_low_value?: number | null
  critical_high_value?: number | null
  normal_text_value?: string
  notes?: string
  is_active: boolean
}

export interface LabTestParameter {
  id: number
  test: number
  code: string
  name: string
  data_type: 'NUMERIC' | 'TEXT' | 'BOOLEAN' | 'CODED'
  data_type_display?: string
  unit?: string
  sort_order: number
  is_active: boolean
  reference_ranges?: LabReferenceRange[]
}

export interface LabTest {
  id: number
  code: string
  name: string
  category: string
  category_display?: string
  description?: string
  specimen_type: string
  collection_instructions?: string
  preparation_instructions?: string
  methodology?: string
  turnaround_time_hours?: number
  is_active: boolean
  parameters?: LabTestParameter[]
  parameter_count?: number
}

export interface LabOrderItem {
  id: number
  order: number
  test: number
  test_code: string
  test_name: string
  specimen_type: string
  priority: LabOrderPriority
  priority_display?: string
  status: LabOrderItemStatus
  status_display?: string
  cancellation_reason?: string
  has_result: boolean
  result_id?: number | null
}

export interface LabSpecimen {
  id: number
  barcode: string
  order: number
  order_reference?: string
  patient_mrn?: string
  patient_name?: string
  specimen_type: string
  collection_location?: string
  status: LabSpecimenStatus
  status_display?: string
  collected_at?: string | null
  collected_by?: number | null
  collected_by_name?: string
  received_at?: string | null
  received_by?: number | null
  received_by_name?: string
  rejected_at?: string | null
  rejected_by?: number | null
  rejected_by_name?: string
  rejection_reason?: string
  notes?: string
  item_count?: number
  created_at: string
}

export interface LabOrder {
  id: number
  order_reference: string
  patient: number
  patient_mrn: string
  patient_name: string
  ordering_doctor: number
  doctor_name: string
  hospital: number
  hospital_name: string
  department?: number | null
  department_name?: string
  encounter?: number | null
  appointment?: number | null
  priority: LabOrderPriority
  priority_display?: string
  status: LabOrderStatus
  status_display?: string
  clinical_indication?: string
  clinical_notes?: string
  ordered_by?: number
  ordered_by_name?: string
  ordered_at: string
  cancelled_by?: number | null
  cancelled_at?: string | null
  cancellation_reason?: string
  items: LabOrderItem[]
  specimens?: LabSpecimen[]
  created_at: string
  updated_at: string
}

export interface LabResultParameter {
  id: number
  result: number
  parameter: number
  parameter_code: string
  parameter_name: string
  data_type: string
  numeric_value?: number | null
  text_value?: string
  unit?: string
  reference_range_display?: string
  abnormality_flag: AbnormalityFlag
  abnormality_display?: string
  is_critical: boolean
  critical_flag?: string
  critical_display?: string
}

export interface LabResultCorrection {
  id: number
  result: number
  parameter: number
  parameter_code: string
  parameter_name: string
  previous_numeric_value?: number | null
  previous_text_value?: string
  new_numeric_value?: number | null
  new_text_value?: string
  correction_reason: string
  corrected_by?: number
  corrected_by_name?: string
  corrected_at: string
}

export interface LabResult {
  id: number
  result_reference: string
  order_item: number
  order_reference?: string
  patient_mrn?: string
  patient_name?: string
  test_code?: string
  test_name?: string
  specimen?: number | null
  specimen_barcode?: string
  status: LabResultStatus
  status_display?: string
  overall_interpretation?: string
  clinical_comments?: string
  is_critical: boolean
  is_abnormal: boolean
  entered_by?: number | null
  entered_by_name?: string
  entered_at?: string | null
  verified_by?: number | null
  verified_by_name?: string
  verified_at?: string | null
  parameter_values: LabResultParameter[]
  corrections: LabResultCorrection[]
  created_at: string
  updated_at: string
}

export interface LabOrderInput {
  patient: number
  ordering_doctor?: number
  priority: LabOrderPriority
  clinical_indication?: string
  clinical_notes?: string
  encounter?: number
  appointment?: number
  test_ids?: number[]
  items_input?: { test_id: number; priority?: LabOrderPriority }[]
}

export interface ParameterValueInput {
  parameter_id: number
  numeric_value?: number | null
  text_value?: string
}

export interface LabResultEntryInput {
  order_item_id: number
  specimen_id?: number
  overall_interpretation?: string
  clinical_comments?: string
  parameter_values: ParameterValueInput[]
}

export interface LabOrderFilterParams {
  page?: number
  page_size?: number
  search?: string
  status?: LabOrderStatus
  priority?: LabOrderPriority
  patient?: number
  ordering_doctor?: number
  ordering?: string
}

export interface LabResultFilterParams {
  page?: number
  page_size?: number
  search?: string
  status?: LabResultStatus
  is_critical?: boolean
  is_abnormal?: boolean
  ordering?: string
}

