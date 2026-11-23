import { ArrowRight, CheckCircle2, Printer, WifiOff } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import PassQr from '../ticket/PassQr'

/**
 * PassIssued — the issue-success panel (§7.5 state "Issue success").
 * It only claims what is true: a signed token means the pass is issued; a
 * queued capture says "saved on this device · pending sync" and shows no QR,
 * because no token exists yet.
 */
export function PassIssued({
  participant,
  token = null,
  passId = null,
  scope = 'Entry · one pass per participant',
  pending = false,
  pendingCount = 0,
  onNext,
  onPrint,
}) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-md border border-teal-500/30 bg-paper shadow-sm"
    >
      <div className="flex items-start gap-3 border-b border-border bg-teal-100 px-4 py-3">
        {pending ? (
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight text-ink-900">
            {pending ? 'Saved on this device' : 'Pass issued'}
          </h2>
          <p className="mt-0.5 text-[11.5px] text-slate-700">
            {pending
              ? `Pending sync${pendingCount ? ` · ${pendingCount} in the queue` : ''}. The pass will be issued and the welcome email queued when the hub reconnects.`
              : 'Show the QR to the participant, print a badge, or let them scan it at entry.'}
          </p>
        </div>
        <Badge tone={pending ? 'amber' : 'teal'} className="ml-auto shrink-0">
          {pending ? 'Pending sync' : 'QR issued'}
        </Badge>
      </div>

      <div className="flex flex-col items-center gap-3 px-4 py-4">
        {!pending && token ? (
          <PassQr value={token} />
        ) : (
          <div className="grid h-[174px] w-[174px] place-items-center rounded-[10px] border border-dashed border-border-strong bg-sand-100 p-4 text-center">
            <p className="text-[11px] font-semibold text-muted">
              {pending
                ? 'No QR yet — a signed pass can only be created by the hub.'
                : 'No QR returned by the hub. Use the printed fallback and check the record.'}
            </p>
          </div>
        )}

        <div className="text-center">
          <p className="text-[15px] font-semibold text-ink-900">{participant?.name}</p>
          {passId && (
            <p className="mt-0.5 font-mono text-[10.5px] tracking-[0.05em] text-muted">
              {passId}
            </p>
          )}
          <p className="mt-1 text-[10px] text-muted">{scope}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row">
        <Button variant="secondary" size="md" onClick={onPrint} className="sm:flex-1">
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print badge
        </Button>
        <Button size="md" onClick={onNext} className="sm:flex-1">
          Next participant
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  )
}

export default PassIssued
