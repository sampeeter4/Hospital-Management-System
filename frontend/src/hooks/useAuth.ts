import { useContext } from 'react'
import { AuthContext, AuthContextType } from '../context/AuthContext'

/**
 * Accesses authentication context state and actions.
 * Throws a descriptive error if accessed outside of AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider> hierarchy.')
  }
  return context
}

export default useAuth

