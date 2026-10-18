import { QueryClient } from '@tanstack/react-query'

/**
 * Central TanStack QueryClient with production healthcare defaults:
 * - Sensible data caching to avoid redundant server roundtrips
 * - Conservative retries on transient network errors
 * - Stable focus behavior for hospital staff active workflows
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes cache retention
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
})

export default queryClient

