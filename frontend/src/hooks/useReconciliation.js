import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import flags from '../content/flags'

/** useReconciliation — flag-gated; no reconciliation endpoint exists yet. */
export default function useReconciliation() {
  return useQuery({
    queryKey: ['admin', 'reconciliation'],
    queryFn: () => client.get('/admin/reconciliation').then((r) => r.data),
    enabled: Boolean(flags.reconciliation),
    retry: false,
  })
}
