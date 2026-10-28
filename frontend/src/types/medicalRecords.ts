export type EncounterType =
  | 'OUTPATIENT'
  | 'EMERGENCY'
  | 'INPATIENT'
  | 'TELEHEALTH'
  | 'FOLLOW_UP'

export type EncounterStatus = 'OPEN' | 'CLOSED'

export interface VitalSigns {
  id?: number
  encounter?: number
  systolic_bp?: number | null
  diastolic_bp?: number | null
  heart_rate?: number | null
  temperature?: string | number | null
  temperature_unit?: 'C' | 'F'
  respiratory_rate?: number | null
  oxygen_saturation?: string | number | null
  height?: string | number | null
  height_unit?: 'cm' | 'm' | 'in'
  weight?: string | number | null
  weight_unit?: 'kg' | 'lb'
  bmi?: string | number | null
  notes?: string
  measured_at?: string
}

export interface EncounterDiagnosis {
  id?: number
  encounter?: number
  diagnosis_description: string
  diagnosis_code?: string
  code_system?: string
  is_primary: boolean
  diagnosis_type: 'PROVISIONAL' | 'CONFIRMED' | 'DIFFERENTIAL'
  clinical_status: 'ACTIVE' | 'RESOLVED' | 'REMISSION'
}

export interface ClinicalNote {
  id?: number
  encounter?: number
  note_type: 'SOAP' | 'CONSULTATION' | 'PROGRESS' | 'DISCHARGE'
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  status: 'DRAFT' | 'SIGNED'
}

export interface ClinicalEncounter {
  id: number
  encounter_reference: string
  patient: number
  patient_name?: string
  patient_mrn?: string
  doctor: number
  doctor_name?: string
  hospital: number
  hospital_name?: string
  department: number
  department_name?: string
  appointment?: number | null
  encounter_type: EncounterType
  status: EncounterStatus
  encounter_date: string
  start_time: string
  end_time?: string | null
  chief_complaint: string
  history_of_present_illness?: string
  clinical_notes_summary?: string
  vital_signs?: VitalSigns[]
  diagnoses?: EncounterDiagnosis[]
  clinical_notes?: ClinicalNote[]
  created_at: string
  updated_at: string
}

export interface EncounterInput {
  patient: number
  doctor: number
  hospital?: number
  department?: number
  appointment?: number | null
  encounter_type?: EncounterType
  encounter_date?: string
  chief_complaint: string
  history_of_present_illness?: string
  clinical_notes_summary?: string
}

export interface EncounterFilterParams {
  patient?: number | string
  doctor?: number | string
  hospital?: number | string
  status?: EncounterStatus | ''
  encounter_type?: EncounterType | ''
  encounter_date?: string
  search?: string
  page?: number
  page_size?: number
}

