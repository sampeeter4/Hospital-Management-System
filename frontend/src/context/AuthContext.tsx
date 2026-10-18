import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { User, LoginRequest } from '../types/auth'
import { UserRole } from '../constants/roles'
import { authStorage } from '../services/auth/authStorage'
import { authApi } from '../services/api/authApi'
import { queryClient } from '../services/api/queryClient'
import { AuthContext, AuthContextType } from './authContextDef'

export { AuthContext }
export type { AuthContextType }

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authStorage.getUser())
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Restore authenticated session on mount
  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      if (!authStorage.hasTokens()) {
        if (isMounted) setIsLoading(false)
        return
      }

      try {
        const profile = await authApi.getProfile()
        if (isMounted) {
          setUser(profile)
          authStorage.setUser(profile)
        }
      } catch {
        // If profile fetch fails on init, clear invalid local state
        authStorage.clearAll()
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  // Login handler
  const login = useCallback(async (credentials: LoginRequest): Promise<User> => {
    setIsLoading(true)
    try {
      // 1. Obtain JWT token pair from backend
      const tokens = await authApi.login(credentials)
      authStorage.setTokens(tokens.access, tokens.refresh)

      // 2. Retrieve authenticated user profile
      const profile = await authApi.getProfile()
      setUser(profile)
      authStorage.setUser(profile)

      return profile
    } catch (error) {
      authStorage.clearAll()
      setUser(null)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Logout handler
  const logout = useCallback(() => {
    authStorage.clearAll()
    setUser(null)
    queryClient.clear()
    window.location.href = '/login'
  }, [])

  // Manual profile re-fetch
  const refreshUser = useCallback(async (): Promise<User | null> => {
    if (!authStorage.hasTokens()) return null
    try {
      const profile = await authApi.getProfile()
      setUser(profile)
      authStorage.setUser(profile)
      return profile
    } catch {
      return null
    }
  }, [])

  // Role verification helpers
  const role = user?.role || null
  const isAuthenticated = Boolean(user && authStorage.hasTokens())

  const hasRole = useCallback(
    (checkRole: UserRole): boolean => {
      return role === checkRole
    },
    [role]
  )

  const hasAnyRole = useCallback(
    (allowedRoles: UserRole[]): boolean => {
      if (!role) return false
      return allowedRoles.includes(role)
    },
    [role]
  )

  const contextValue = useMemo(
    () => ({
      user,
      role,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshUser,
      hasRole,
      hasAnyRole,
    }),
    [user, role, isAuthenticated, isLoading, login, logout, refreshUser, hasRole, hasAnyRole]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export default AuthProvider
