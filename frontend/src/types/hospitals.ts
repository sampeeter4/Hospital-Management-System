export interface Hospital {
  id: number
  name: string
  registration_number: string
  address: string
  city: string
  state: string
  postal_code: string
  phone: string
  email: string
  website?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type HospitalInput = Omit<Hospital, 'id' | 'created_at' | 'updated_at'>

export interface Department {
  id: number
  hospital: number
  hospital_name?: string
  name: string
  code: string
  description?: string
  phone?: string
  location?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DepartmentInput = Omit<Department, 'id' | 'hospital_name' | 'created_at' | 'updated_at'>

export interface Doctor {
  id: number
  user: number
  doctor_id: string
  doctor_name?: string
  email?: string
  hospital: number
  hospital_name?: string
  department: number
  department_name?: string
  specialization: string
  license_number: string
  qualification: string
  experience_years: number
  consultation_fee: string | number
  bio?: string
  is_available: boolean
  created_at: string
  updated_at: string
}

export type DoctorInput = Omit<Doctor, 'id' | 'doctor_name' | 'email' | 'hospital_name' | 'department_name' | 'created_at' | 'updated_at'>

export interface Staff {
  id: number
  user: number
  employee_id: string
  staff_name?: string
  email?: string
  hospital: number
  hospital_name?: string
  department?: number | null
  department_name?: string
  designation: string
  joining_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type StaffInput = Omit<Staff, 'id' | 'staff_name' | 'email' | 'hospital_name' | 'department_name' | 'created_at' | 'updated_at'>

export interface UserAccountOption {
  id: number
  username: string
  email: string
  role: string
  phone?: string
}

export interface PaginatedResponse<T> {
  count?: number
  next?: string | null
  previous?: string | null
  results?: T[]
}
