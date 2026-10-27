import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../../services/api/dashboardApi'
import { useAuth } from '../useAuth'
import { ROLES } from '../../constants/roles'
import { DashboardMetricsResponse } from '../../types/dashboard'

/**
 * React Query hook for role-tailored dashboard metrics.
 * Safely disables fetching for PATIENT role since patients are blocked from staff reports.
 */
export const useDashboardData = () => {
  const { role, isAuthenticated } = useAuth()
  const isPatient = role === ROLES.PATIENT

  return useQuery<DashboardMetricsResponse, Error>({
    queryKey: ['dashboard', 'metrics', role],
    queryFn: () => dashboardApi.getMetrics(),
    enabled: isAuthenticated && !isPatient,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Optional soft 5-minute background refresh
  })
}

export default useDashboardData

