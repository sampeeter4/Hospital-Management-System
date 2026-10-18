import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { authStorage } from '../auth/authStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request Interceptor: Injects current Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authStorage.getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Concurrency-safe token refresh queue state
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// Response Interceptor: Automatically handles 401 and executes token refresh with queue
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomRequestConfig | undefined

    // Bypass refresh logic if error is not 401 or request is already a retry or is an auth endpoint
    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const requestUrl = originalRequest.url || ''
    if (requestUrl.includes('/accounts/login/') || requestUrl.includes('/accounts/token/refresh/')) {
      return Promise.reject(error)
    }

    // Check if refresh token is available
    const refreshToken = authStorage.getRefreshToken()
    if (!refreshToken) {
      authStorage.clearAll()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1'
      }
      return Promise.reject(error)
    }

    // If a refresh is already in-flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((newAccessToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          }
          return apiClient(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      // Use clean standalone axios instance to prevent recursive interceptor triggers
      const refreshResponse = await axios.post<{ access: string; refresh?: string }>(
        `${API_BASE_URL}/accounts/token/refresh/`,
        { refresh: refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      )

      const { access, refresh: newRefresh } = refreshResponse.data
      authStorage.setTokens(access, newRefresh || refreshToken)

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access}`
      }

      processQueue(null, access)
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      authStorage.clearAll()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1'
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default apiClient
