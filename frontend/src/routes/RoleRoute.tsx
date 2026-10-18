import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { UserRole } from '../constants/roles'
import { Loading } from '../components/ui'

interface RoleRouteProps {
  allowedRoles: UserRole[]
  children?: React.ReactNode
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, role, isLoading } = useAuth()

  if (isLoading) {
    return <Loading fullScreen message="Checking permissions..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default RoleRoute

