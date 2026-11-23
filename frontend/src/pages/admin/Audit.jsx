import flags from '../../content/flags'
import { Card } from '../../components/ui/Card'
import { WaitingForBackend } from '../../components/volunteer/WaitingForBackend'
import { ShieldAlert } from 'lucide-react'

/** Audit log — flag-gated; the backend has no audit endpoint yet. */
export default function Audit() {
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Audit log</h2>
        <p className="mt-0.5 text-[11px] text-muted">Who changed what, and when.</p>
      </div>
      {flags.auditV2 ? (
        <Card variant="paper" padded className="p-4">
          <p className="text-[11px] text-muted">Audit entries appear here when the hub exposes them.</p>
        </Card>
      ) : (
        <WaitingForBackend title="Audit log is waiting for the hub" endpoints={['GET /api/admin/audit']} />
      )}
      <p className="flex items-center gap-1.5 text-[10.5px] text-muted">
        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Identity checks, pass issues and voids are recorded with a reason.
      </p>
    </div>
  )
}
