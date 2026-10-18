import { UserRole } from '../constants'

export interface User {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  role: UserRole
  phone?: string
  is_verified?: boolean
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  data: T
  message?: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status_code?: number
}

