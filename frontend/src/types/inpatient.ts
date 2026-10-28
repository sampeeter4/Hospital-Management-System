export type WardType =
  | 'GENERAL'
  | 'ICU'
  | 'NICU'
  | 'CCU'
  | 'PEDIATRIC'
  | 'MATERNITY'
  | 'SURGICAL'
  | 'ORTHOPEDIC'
  | 'ONCOLOGY'
  | 'PSYCHIATRIC'
  | 'ISOLATION'
  | 'EMERGENCY'

export type GenderPolicy = 'ALL' | 'MALE_ONLY' | 'FEMALE_ONLY'

export type RoomType =
  | 'STANDARD'
  | 'SEMI_PRIVATE'
  | 'PRIVATE'
  | 'DELUXE'
  | 'ISOLATION'
  | 'INTENSIVE_CARE'

export type BedStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'CLEANING'
  | 'ISOLATION'
  | 'INACTIVE'

export type BedType =
  | 'STANDARD'
  | 'ICU_BED'
  | 'ELECTRIC'
  | 'PEDIATRIC_CRIB'
  | 'BIRTHING'
  | 'BARIATRIC'

export type AdmissionStatus = 'ADMITTED' | 'DISCHARGED' | 'CANCELLED'

export type AdmissionType =
  | 'EMERGENCY'
  | 'ELECTIVE'
  | 'NEWBORN'
  | 'URGENT'
  | 'TRANSFER'

export type DischargeDisposition =
  | 'HOME_ROUTINE'
  | 'HOME_CARE'
  | 'TRANSFER_FACILITY'
  | 'AGAINST_ADVICE'
  | 'EXPIRED'
  | 'OTHER'

export interface Ward {
  id: number
  hospital: number
  hospital_name: string
  department?: number | null
  department_name?: string
  code: string
  name: string
  ward_type: WardType
  ward_type_display?: string
  gender_policy: GenderPolicy
  gender_policy_display?: string
  floor?: string
  description?: string
  is_active: boolean
  total_rooms: number
  total_beds: number
  occupied_beds: number
  available_beds: number
  created_at: string
  updated_at: string
}

export interface Room {
  id: number
  ward: number
  ward_name: string
  ward_code: string
  hospital_name: string
  room_number: string
  room_type: RoomType
  room_type_display?: string
  floor?: string
  capacity: number
  is_active: boolean
  current_bed_count: number
  available_bed_count: number
  created_at: string
  updated_at: string
}

export interface Bed {
  id: number
  room: number
  room_number: string
  ward_id: number
  ward_name: string
  hospital_id: number
  hospital_name: string
  bed_number: string
  bed_type: BedType
  bed_type_display?: string
  status: BedStatus
  status_display?: string
  equipment_details?: string
  current_patient_mrn?: string | null
  current_patient_name?: string | null
  created_at: string
  updated_at: string
}

export interface BedAssignment {
  id: number
  admission: number
  admission_reference: string
  bed: number
  bed_number: string
  room_number: string
  ward_name: string
  patient_mrn: string
  patient_name: string
  start_time: string
  end_time?: string | null
  is_active: boolean
  assigned_by?: number
  assigned_by_name?: string
  released_by?: number | null
  released_by_name?: string
  reason?: string
  created_at: string
}

export interface Admission {
  id: number
  admission_reference: string
  patient: number
  patient_mrn: string
  patient_name: string
  hospital: number
  hospital_name: string
  attending_doctor: number
  doctor_name: string
  department?: number | null
  department_name?: string
  encounter?: number | null
  appointment?: number | null
  admission_type: AdmissionType
  admission_type_display?: string
  admission_reason: string
  admission_date: string
  expected_discharge_date?: string | null
  actual_discharge_date?: string | null
  status: AdmissionStatus
  status_display?: string
  admitted_by?: number
  admitted_by_name?: string
  discharged_by?: number | null
  discharged_by_name?: string
  discharge_disposition?: DischargeDisposition
  discharge_disposition_display?: string
  discharge_instructions?: string
  discharge_summary?: string
  cancellation_reason?: string
  current_bed?: string | null
  current_bed_id?: number | null
  current_ward_name?: string | null
  current_room_number?: string | null
  bed_assignments?: BedAssignment[]
  created_at: string
  updated_at: string
}

export interface AdmissionInput {
  patient: number
  attending_doctor: number
  admission_type: AdmissionType
  admission_reason: string
  admission_date?: string
  expected_discharge_date?: string
  encounter?: number
  appointment?: number
  initial_bed_id?: number | null
}

export interface DischargeInput {
  discharge_disposition?: DischargeDisposition
  discharge_instructions?: string
  discharge_summary?: string
  discharge_date?: string
}

export interface OccupancyReport {
  hospital_id?: number
  hospital_name?: string
  ward_id?: number
  ward_name?: string
  total_capacity: number
  occupied_beds: number
  available_beds: number
  maintenance_beds: number
  cleaning_beds: number
  occupancy_rate_percent: number
  generated_at?: string
}

export interface AdmissionFilterParams {
  page?: number
  page_size?: number
  search?: string
  status?: AdmissionStatus
  admission_type?: AdmissionType
  patient?: number
  hospital?: number
  attending_doctor?: number
}

export interface BedFilterParams {
  page?: number
  page_size?: number
  search?: string
  room?: number
  ward?: number
  hospital?: number
  status?: BedStatus
  bed_type?: BedType
}

