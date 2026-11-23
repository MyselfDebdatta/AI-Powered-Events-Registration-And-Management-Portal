import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import flags from '../content/flags'
import usePageVisible from './usePageVisible'

/** useLiveOps — flag-gated; no live-ops endpoint exists in the backend yet. */
export default function useLiveOps() {
  const visible = usePageVisible()
  return useQuery({
    queryKey: ['admin', 'live-ops'],
    queryFn: () => client.get('/admin/live-ops').then((r) => r.data),
    enabled: Boolean(flags.liveOps),
    retry: false,
    // Poll every 30s only while the tab is foregrounded (§12.5).
    refetchInterval: flags.liveOps && visible ? 30_000 : false,
  })
}
