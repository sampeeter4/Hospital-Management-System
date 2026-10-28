export type PrescriptionStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_DISPENSED'
  | 'DISPENSED'
  | 'CANCELLED'

export interface Medicine {
  id: number
  code: string
  generic_name: string
  brand_name: string
  active_ingredients: string
  strength: string
  dosage_form: string
  route_of_administration: string
  manufacturer: string
  description?: string
  dispensing_unit: string
  requires_prescription: boolean
  low_stock_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PrescriptionItem {
  id?: number
  prescription?: number
  medicine: number
  medicine_name?: string
  dosage_instructions: string
  route?: string
  frequency: string
  duration_value: number
  duration_unit: 'DAYS' | 'WEEKS' | 'MONTHS'
  quantity_prescribed: number
  quantity_dispensed?: number
  dispensing_unit?: string
  patient_instructions?: string
  allow_substitution?: boolean
  status?: string
  allergy_warning?: string
  allergy_override?: boolean
  allergy_override_reason?: string
}

export interface Prescription {
  id: number
  prescription_reference: string
  patient: number
  patient_name?: string
  patient_mrn?: string
  doctor: number
  doctor_name?: string
  hospital: number
  hospital_name?: string
  encounter?: number | null
  appointment?: number | null
  status: PrescriptionStatus
  prescribed_date: string
  clinical_indication?: string
  general_instructions?: string
  cancellation_reason?: string
  items?: PrescriptionItem[]
  created_at: string
  updated_at: string
}

export interface PrescriptionInput {
  patient: number
  doctor: number
  hospital?: number
  encounter?: number | null
  appointment?: number | null
  clinical_indication?: string
  general_instructions?: string
  items: PrescriptionItem[]
}

export interface AggregatedStock {
  medicine_id: number
  medicine__generic_name: string
  medicine__code: string
  pharmacy_location_id: number
  pharmacy_location__name: string
  total_available: number
}

export interface MedicineBatch {
  id: number
  medicine: number
  medicine_name?: string
  medicine_code?: string
  pharmacy_location: number
  location_name?: string
  batch_number: string
  expiry_date: string
  available_quantity: number
  batch_status: string
  is_expired?: boolean
}

export interface PrescriptionFilterParams {
  patient?: number | string
  doctor?: number | string
  hospital?: number | string
  status?: PrescriptionStatus | ''
  search?: string
  page?: number
  page_size?: number
}

