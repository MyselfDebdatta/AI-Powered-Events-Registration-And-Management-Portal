import { Badge } from '../ui/Badge'
import { pct } from '../../hooks/useDashboard'

const BAR_TONE = {
  ink: 'bg-ink-700',
  gold: 'bg-gold-500',
  teal: 'bg-teal-500',
}

/** Funnel — registered → checked in, computed from live dashboard stats. */
export function Funnel({ rows = [], total = 0, variance = 0 }) {
  return (
    <div className="space-y-2.5">
      {rows.map((row) => {
        const share = total ? pct(row.value, total) : 0
        return (
          <div key={row.label} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[9px]">
              <span className="font-medium text-ink-900">{row.label}</span>
              <span className="font-mono text-[8.5px] text-muted">{row.value}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-sand-200 overflow-hidden">
              <div
                className={`h-full rounded-full ${BAR_TONE[row.tone] ?? BAR_TONE.ink}`}
                style={{ width: `${share}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-[9px] text-muted">
        <span>Variance</span>
        <Badge tone={variance > 0 ? 'amber' : 'teal'} className="text-[8.5px]">
          {variance}%
        </Badge>
      </div>
    </div>
  )
}

export default Funnel
