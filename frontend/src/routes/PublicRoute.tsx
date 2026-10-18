import React from 'react'
import { Navigate, Outlet, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Loading } from '../components/ui'

interface PublicRouteProps {
  children?: React.ReactNode
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const [searchParams] = useSearchParams()

  if (isLoading) {
    return <Loading fullScreen message="Checking session..." />
  }

  if (isAuthenticated) {
    const destination = searchParams.get('redirect') || '/dashboard'
    return <Navigate to={destination} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default PublicRoute

