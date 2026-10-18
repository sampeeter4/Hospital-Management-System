import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

// Environment-driven API Base URL with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

/**
 * Primary Axios client instance for Hospital Management System API communication.
 * Structured with request interceptor foundation for JWT Bearer token attachment in Phase 2.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request Interceptor: Injects Bearer token if present in secure client storage (Phase 2 integration)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor: Foundation for global error handling and 401 token refresh in Phase 2
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Phase 2 will attach automated refresh token rotation here
    return Promise.reject(error)
  }
)

export default apiClient

