import flags from '../../content/flags'
import useReconciliation from '../../hooks/useReconciliation'
import useDashboard from '../../hooks/useDashboard'
import { Card } from '../../components/ui/Card'
import { Funnel } from '../../components/admin/Funnel'
import { WaitingForBackend } from '../../components/volunteer/WaitingForBackend'

/**
 * Reconciliation — registered → checked in. The live funnel is computed from
 * /api/admin/dashboard; variance details need an endpoint and are flag-gated.
 */
export default function Reconciliation() {
  const { data } = useReconciliation()
  const { registered, arrived, attendanceRecords, arrivalRate, funnelRows } = useDashboard()

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Reconciliation</h2>
        <p className="mt-0.5 text-[11px] text-muted">Registered → arrived → checked in, from the live register.</p>
      </div>

      <Card variant="paper" padded className="p-4">
        <Funnel rows={funnelRows} total={registered} variance={100 - arrivalRate} />
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-[11px]">
          {[
            ['Registered', registered],
            ['Arrived', arrived],
            ['Checked in', attendanceRecords],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted">{label}</dt>
              <dd className="font-semibold text-ink-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {!flags.reconciliation ? (
        <WaitingForBackend title="Variance details are waiting for the hub" endpoints={['GET /api/admin/reconciliation']} />
      ) : (
        <Card variant="paper" padded className="p-4">
          <pre className="overflow-x-auto text-[11px]">{JSON.stringify(data ?? {}, null, 2)}</pre>
        </Card>
      )}
    </div>
  )
}
