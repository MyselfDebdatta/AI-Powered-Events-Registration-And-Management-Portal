import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import flags from '../content/flags'

/**
 * useImports — imports list/detail (Phase 4). The backend has no imports
 * endpoint yet, so the hook is flag-gated and never calls a guessed route.
 */
export function useImports() {
  return useQuery({
    queryKey: ['admin', 'imports'],
    queryFn: () => client.get('/admin/imports').then((r) => r.data),
    enabled: Boolean(flags.importsV2),
    retry: false,
  })
}

export function useImport(id) {
  return useQuery({
    queryKey: ['admin', 'imports', id],
    queryFn: () => client.get(`/admin/imports/${id}`).then((r) => r.data),
    enabled: Boolean(flags.importsV2) && Boolean(id),
    retry: false,
  })
}
