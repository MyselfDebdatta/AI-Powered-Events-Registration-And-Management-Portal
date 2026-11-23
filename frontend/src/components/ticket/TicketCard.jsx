import { CheckCircle2, Ban } from 'lucide-react'
import { cn } from '../../lib/cn'
import { KonarkMark } from '../public/KonarkMark'
import { Badge } from '../ui/Badge'
import PassQr from './PassQr'
import TicketStub from './TicketStub'

/**
 * TicketCard — the ink pass itself (§7.4, mockup 05): 18px radius, 1px gold
 * inset, Konark watermark, QR on white, pass ID readable without scanning,
 * perforation and stub.
 *
 * QR rule (acceptance): a QR renders **only** for `state === 'issued'`.
 * Used passes show "Entry recorded"; expired/revoked show no scan target at
 * all. Colour never carries meaning alone — every state also has text.
 */

const PILL = {
  issued: { tone: 'teal', label: 'Valid for one entry' },
  used: { tone: 'grey', label: 'Entry recorded' },
  expired: { tone: 'amber', label: 'Expired' },
  revoked: { tone: 'red', label: 'Revoked' },
}

function QrSlot({ state, usedAtLabel }) {
  if (state === 'issued') return null // PassQr renders from the parent

  if (state === 'used') {
    return (
      <div
        data-testid="qr-replaced"
        className="flex h-[174px] w-[174px] flex-col items-center justify-center gap-2 rounded-[10px] border border-ivory-100/14 bg-white/6 p-4 text-center"
      >
        <CheckCircle2 className="h-7 w-7 text-teal-500" aria-hidden="true" />
        <span className="text-xs font-semibold text-ivory-100">Entry recorded</span>
        {usedAtLabel && (
          <span className="font-mono text-[10px] text-ivory-100/62">{usedAtLabel}</span>
        )}
      </div>
    )
  }

  // expired / revoked — never a scan target (§7.4 acceptance)
  return (
    <div
      data-testid="qr-absent"
      className="flex h-[174px] w-[174px] flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-ivory-100/25 bg-white/4 p-4 text-center"
    >
      <Ban className="h-6 w-6 text-ivory-100/50" aria-hidden="true" />
      <span className="text-[11px] font-semibold text-ivory-100/70">
        {state === 'expired' ? 'This pass can no longer be scanned' : 'This pass was revoked'}
      </span>
    </div>
  )
}

export function TicketCard({
  state = 'issued',
  name,
  passId,
  token,
  scope,
  usedAtLabel,
  className,
}) {
  const pill = PILL[state] ?? PILL.issued
  const desaturated = state === 'used'

  return (
    <article
      data-ticket-state={state}
      className={cn(
        'ticket-card relative overflow-hidden rounded-[18px] bg-ink-900 text-ivory-100',
        'shadow-[0_22px_44px_-20px_rgba(11,31,58,0.45)] ring-1 ring-inset ring-gold-500/44',
        desaturated && 'grayscale',
        className
      )}
    >
      <KonarkMark
        aria-hidden="true"
        strokeWidth={1.1}
        className="pointer-events-none absolute -right-7 -top-7.5 h-[150px] w-[150px] text-gold-500 opacity-15"
      />

      <div className="relative px-[18px] pt-[17px]">
        <p className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-gold-500">
          Entry pass · Odisha AI Symposium
        </p>
        <p className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.025em] text-ivory-50">
          {name || 'Participant'}
        </p>
        <p className="mt-0.5 text-[9.5px] tracking-[0.03em] text-ivory-100/50">
          SOA University · Bhubaneswar
        </p>
      </div>

      <div className="relative mt-3 flex justify-center">
        {state === 'issued' ? <PassQr value={token} /> : <QrSlot state={state} usedAtLabel={usedAtLabel} />}
      </div>

      {passId && (
        <p
          data-testid="pass-id"
          className="relative mt-2 text-center font-mono text-[10px] tracking-[0.05em] text-ivory-100/62"
        >
          {passId}
        </p>
      )}

      <div className="relative mt-1.5 flex justify-center">
        <Badge tone={pill.tone} dot className="h-[23px] px-2.5 text-[9px]">
          {pill.label}
        </Badge>
      </div>

      {/* Perforation — notches are clipped by the card's overflow-hidden */}
      <div className="relative mt-3.5 border-t border-dashed border-ivory-100/22">
        <span
          aria-hidden="true"
          className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-ivory-100"
        />
        <span
          aria-hidden="true"
          className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-ivory-100"
        />
      </div>

      <TicketStub scope={scope} issuedAt="Arrival desk" />
    </article>
  )
}

export default TicketCard
