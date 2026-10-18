import { UserRole } from '../constants/roles'

/**
 * Authenticated User model returned by GET /api/v1/accounts/profile/
 */
export interface User {
  id: number
  username: string
  email: string
  phone: string
  role: UserRole
  is_verified: boolean
  date_joined: string
  last_login: string | null
  first_name?: string
  last_name?: string
}

/**
 * Payload sent to POST /api/v1/accounts/login/
 */
export interface LoginRequest {
  username: string // Accepts username or email via EmailOrUsernameModelBackend
  password: string
}

/**
 * Token pair returned by POST /api/v1/accounts/login/
 */
export interface LoginResponse {
  access: string
  refresh: string
}

/**
 * Payload sent to POST /api/v1/accounts/token/refresh/
 */
export interface RefreshTokenRequest {
  refresh: string
}

/**
 * Response returned by POST /api/v1/accounts/token/refresh/
 */
export interface RefreshTokenResponse {
  access: string
  refresh?: string
}

/**
 * Core Auth state managed by AuthContext
 */
export interface AuthState {
  user: User | null
  role: UserRole | null
  isAuthenticated: boolean
  isLoading: boolean
}

