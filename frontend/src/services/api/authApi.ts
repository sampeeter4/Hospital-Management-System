import apiClient from './client'
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  User,
} from '../../types/auth'

/**
 * Dedicated API service for Django REST Framework accounts endpoints.
 */
export const authApi = {
  /**
   * Authenticates user credentials via POST /api/v1/accounts/login/
   */
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/accounts/login/', payload)
    return response.data
  },

  /**
   * Refreshes expired access token via POST /api/v1/accounts/token/refresh/
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>('/accounts/token/refresh/', {
      refresh: refreshToken,
    })
    return response.data
  },

  /**
   * Fetches current authenticated user profile via GET /api/v1/accounts/profile/
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/accounts/profile/')
    return response.data
  },

  /**
   * Updates authenticated user profile via PATCH /api/v1/accounts/profile/
   */
  async updateProfile(payload: Partial<User>): Promise<User> {
    const response = await apiClient.patch<User>('/accounts/profile/', payload)
    return response.data
  },
}

export default authApi

