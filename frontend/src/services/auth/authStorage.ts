import { User } from '../../types/auth'

const ACCESS_TOKEN_KEY = 'hms_access_token'
const REFRESH_TOKEN_KEY = 'hms_refresh_token'
const USER_KEY = 'hms_auth_user'

/**
 * Centralized authentication storage service.
 * Safely abstracts token and session persistence.
 */
export const authStorage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY)
    } catch {
      return null
    }
  },

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY)
    } catch {
      return null
    }
  },

  setTokens(access: string, refresh?: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, access)
      if (refresh) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
      }
    } catch (e) {
      console.error('Failed to store authentication tokens in storage', e)
    }
  },

  clearTokens(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    } catch (e) {
      console.error('Failed to clear authentication tokens from storage', e)
    }
  },

  getUser(): User | null {
    try {
      const data = localStorage.getItem(USER_KEY)
      if (!data) return null
      return JSON.parse(data) as User
    } catch {
      return null
    }
  },

  setUser(user: User): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } catch (e) {
      console.error('Failed to store user profile in storage', e)
    }
  },

  clearUser(): void {
    try {
      localStorage.removeItem(USER_KEY)
    } catch (e) {
      console.error('Failed to clear user profile from storage', e)
    }
  },

  clearAll(): void {
    this.clearTokens()
    this.clearUser()
  },

  hasTokens(): boolean {
    return Boolean(this.getAccessToken())
  },
}

export default authStorage

