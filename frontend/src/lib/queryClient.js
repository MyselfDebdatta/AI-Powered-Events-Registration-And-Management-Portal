import { QueryClient } from '@tanstack/react-query'

/**
 * Shared TanStack Query defaults (FrontendPlanning.md §10.5):
 * - explicit staleTime per data class
 * - no retry on 4xx (a 401/403/404 will not fix itself)
 * - mutations never retry automatically (writes must stay idempotent)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // event content overrides to 5 min where static
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error?.response?.status ?? error?.status
        if (status && status >= 400 && status < 500) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})

export default queryClient
