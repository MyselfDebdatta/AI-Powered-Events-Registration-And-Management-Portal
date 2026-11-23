import flags from '../../content/flags'
import useLiveOps from '../../hooks/useLiveOps'
import { Card } from '../../components/ui/Card'
import { WaitingForBackend } from '../../components/volunteer/WaitingForBackend'
import { Activity } from 'lucide-react'

/** Live ops — flag-gated; the backend has no live-ops endpoint yet. */
export default function LiveOps() {
  const { data, isLoading } = useLiveOps()

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Live ops</h2>
        <p className="mt-0.5 text-[11px] text-muted">Station health, queue depth and freshness at a glance.</p>
      </div>
      {!flags.liveOps ? (
        <WaitingForBackend title="Live ops is waiting for the hub" endpoints={['GET /api/admin/live-ops']} />
      ) : (
        <Card variant="paper" padded className="p-4">
          {isLoading ? (
            <p className="text-[11px] text-muted">Loading live status…</p>
          ) : (
            <pre className="overflow-x-auto text-[11px]">{JSON.stringify(data ?? {}, null, 2)}</pre>
          )}
        </Card>
      )}
      <p className="flex items-center gap-1.5 text-[10.5px] text-muted">
        <Activity className="h-3.5 w-3.5" aria-hidden="true" /> Check the arrival desk for the live offline queue.
      </p>
    </div>
  )
}
