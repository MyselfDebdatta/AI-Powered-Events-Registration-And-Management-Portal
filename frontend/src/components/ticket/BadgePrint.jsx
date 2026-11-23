import { QRCodeSVG } from 'qrcode.react'
import { Printer, Copy } from 'lucide-react'
import { Button } from '../ui/Button'
import { KonarkMark } from '../public/KonarkMark'
import event from '../../content/event'

/**
 * BadgePrint — the CR80 desk badge (§7.5 "print badge", 85.6 × 54 mm).
 * It prints the name and pass ID even when the hub has not returned a signed
 * token yet; the QR only appears for a real token, never as a placeholder.
 */

function withPrintClass(className) {
  document.body.classList.add(className)
  const cleanup = () => {
    document.body.classList.remove(className)
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  try {
    window.print?.()
  } finally {
    window.setTimeout(cleanup, 1200)
  }
}

/** Print one CR80 badge at 85.6 × 54 mm. */
export function printBadgeSheet() {
  withPrintClass('badge-printing')
}

/** Print an A4 sheet of eight CR80 badges with crop marks (§12.7). */
export function printBadgeA4Sheet() {
  withPrintClass('badge-sheet-printing')
}

function BadgeCard({ participant, passId, token, deskLabel, station, scope, testId }) {
  return (
    <div
      data-testid={testId}
      className="badge-print relative overflow-hidden rounded-[3mm] border border-ink-900/20 bg-white text-ink-900 shadow-md"
    >
      <div className="flex items-center gap-1.5 bg-ink-900 px-3 py-1.5 text-ivory-50">
        <KonarkMark className="h-4 w-4 text-gold-500" strokeWidth={1.7} />
        <div className="min-w-0">
          <p className="text-[8px] font-bold uppercase leading-tight tracking-[0.12em] text-gold-500">
            {event.shortName}
          </p>
          <p className="truncate text-[6.5px] uppercase tracking-[0.08em] text-ivory-100/65">
            {event.venue.institution} · {event.venue.city}
          </p>
        </div>
      </div>

      <div className="flex h-[38mm] items-start gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[6px] font-bold uppercase tracking-[0.14em] text-muted">Participant</p>
          <p className="mt-0.5 break-words text-[13px] font-semibold leading-[1.1] tracking-[-0.02em]">
            {participant?.name || 'Participant'}
          </p>
          <p className="mt-1 truncate text-[7px] text-slate-700">
            {participant?.institution || 'Institution not recorded'}
          </p>
          <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.06em] text-ink-900">
            {participant?.category || 'Category not recorded'}
          </p>
          <div className="mt-2 border-t border-dashed border-ink-900/20 pt-1.5">
            <p className="text-[6px] font-bold uppercase tracking-[0.12em] text-muted">Pass ID</p>
            <p className="font-mono text-[9px] font-semibold tracking-[0.03em]">
              {passId || (token ? 'See signed pass' : 'Not issued yet')}
            </p>
          </div>
        </div>

        <div className="grid shrink-0 place-items-center rounded-[2mm] border border-ink-900/10 bg-white p-1">
          {token ? (
            <QRCodeSVG value={token} size={64} level="H" marginSize={4} />
          ) : (
            <div className="grid h-16 w-16 place-items-center px-1 text-center text-[6px] font-semibold leading-tight text-muted">
              No QR until the pass is issued
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-ink-900/10 px-3 py-1 text-[6px] text-muted">
        <span>{scope}</span>
        <span className="font-mono">
          {deskLabel}
          {station ? ` · ${station}` : ''}
        </span>
      </div>
    </div>
  )
}

export function BadgePrint({
  participant,
  passId = null,
  token = null,
  deskLabel = 'Arrival desk',
  station = null,
  scope = 'Entry · one pass per participant',
}) {
  const props = { participant, passId, token, deskLabel, station, scope }
  return (
    <div className="badge-print-sheet flex flex-col items-center gap-3">
      <BadgeCard {...props} testId="badge-print" />

      <div className="flex w-full gap-2">
        <Button variant="secondary" size="sm" onClick={printBadgeSheet} className="flex-1">
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          Print badge
        </Button>
        <Button variant="secondary" size="sm" onClick={printBadgeA4Sheet} className="flex-1">
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          A4 sheet (8)
        </Button>
      </div>

      {/* Hidden on screen, revealed by the A4 print stylesheet. */}
      <div className="badge-sheet" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <BadgeCard key={index} {...props} />
        ))}
      </div>
    </div>
  )
}

export default BadgePrint
