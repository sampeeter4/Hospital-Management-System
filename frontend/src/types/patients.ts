export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

export type BloodGroup =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-'
  | 'UNKNOWN'

export interface Patient {
  id: number
  user: number
  username: string
  patient_name: string
  email: string
  mrn: string
  date_of_birth: string
  gender: Gender
  blood_group: BloodGroup
  phone: string
  address: string
  city: string
  state: string
  postal_code: string
  emergency_contact_name: string
  emergency_contact_relationship: string
  emergency_contact_phone: string
  allergies: string
  medical_history: string
  insurance_provider: string
  insurance_policy_number: string
  insurance_member_id: string
  insurance_expiry_date: string | null
  hospital: number | null
  hospital_name: string
  created_at: string
  updated_at: string
}

export interface PatientInput {
  user: number
  hospital?: number | null
  date_of_birth: string
  gender: Gender
  blood_group?: BloodGroup
  phone?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  emergency_contact_name?: string
  emergency_contact_relationship?: string
  emergency_contact_phone?: string
  allergies?: string
  medical_history?: string
  insurance_provider?: string
  insurance_policy_number?: string
  insurance_member_id?: string
  insurance_expiry_date?: string | null
}

export interface PatientFilterParams {
  search?: string
  gender?: Gender | ''
  blood_group?: BloodGroup | ''
  hospital?: number | string
  page?: number
  page_size?: number
}
