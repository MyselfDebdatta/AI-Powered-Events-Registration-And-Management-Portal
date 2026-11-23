import { cn } from '../../lib/cn'

const TONE = {
  ink: 'text-ink-900',
  teal: 'text-teal-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
}

const ICON_TONE = {
  ink: 'bg-sand-100 text-ink-700',
  teal: 'bg-teal-100 text-teal-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
}

/** KpiCard — one overview metric. `sub` is a label, not an invented number. */
export function KpiCard({ label, value, sub, tone = 'ink', icon: Icon, className }) {
  return (
    <div className={cn('rounded-md border border-border bg-paper p-3.5 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted">{label}</div>
          <div className={cn('mt-1 text-[24px] font-bold tabular-nums leading-none', TONE[tone] ?? TONE.ink)}>
            {value}
          </div>
          {sub && <div className="mt-1.5 text-[8.5px] text-muted">{sub}</div>}
        </div>
        {Icon && (
          <div className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-sm', ICON_TONE[tone] ?? ICON_TONE.ink)}>
            <Icon className="h-3 w-3" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  )
}

export default KpiCard
