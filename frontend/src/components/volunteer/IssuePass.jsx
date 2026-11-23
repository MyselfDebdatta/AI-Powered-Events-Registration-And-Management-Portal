import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  CircleUserRound,
  Printer,
  ShieldCheck,
  Ticket,
  UserRound,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Banner } from '../ui/Banner'
import { Button } from '../ui/Button'
import Select from '../ui/Select'
import { cn } from '../../lib/cn'
import WaitingForBackend from './WaitingForBackend'

/**
 * IssuePass — the verify → issue column (§7.5, mockup 06).
 *
 * Gold appears here for exactly one action: "Issue QR pass" (§5.3). The button
 * stays disabled until the volunteer has confirmed a candidate and, on the
 * manual/low-confidence path, chosen which secondary ID was checked.
 */

export const REASONS = [
  'Photo ID checked',
  'Name and institution confirmed',
  'Registration reference checked',
  'Other — noted in the record',
]

function PersonPhoto({ participant }) {
  const [failed, setFailed] = useState(false)
  const src = participant?.photoUrl
  const usable = src && !failed

  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-sand-200 text-sand-300">
      {usable ? (
        <img
          src={src.startsWith('/') || src.startsWith('http') ? src : `/${src}`}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <UserRound className="h-6 w-6" aria-hidden="true" />
      )}
    </span>
  )
}

function DataRow({ label, children, last = false }) {
  return (
    <div
      className={cn(
        'grid grid-cols-[84px_1fr] items-center gap-3 py-1.5',
        !last && 'border-b border-border'
      )}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="min-w-0 text-[12px] text-slate-700">{children}</span>
    </div>
  )
}

const AFTER_ROWS = [
  {
    title: 'Pass appears on screen',
    body: 'Show it, print a badge, or send it to the participant.',
  },
  {
    title: 'Welcome email is queued',
    body: 'Sends automatically when the hub reconnects.',
  },
  {
    title: 'Status becomes QR issued',
    body: 'The pass is then ready to scan at entry.',
  },
]

export function IssuePass({
  participant,
  confidence = null,
  manual = false,
  threshold = 0.4,
  confirmed = false,
  reason = '',
  onReasonChange,
  requireReason = false,
  alreadyArrived = false,
  alreadyArrivedAt = null,
  alreadyCheckedIn = false,
  alreadyCheckedInAt = null,
  onIssue,
  issuing = false,
  backendPending = false,
  issueError = null,
  onPrint,
  onViewRecord,
  manualHref = '/volunteer/manual?mode=entry',
}) {
  if (!participant) {
    return (
      <section className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border-strong bg-paper p-8 text-center">
        <CircleUserRound className="h-9 w-9 text-sand-300" aria-hidden="true" />
        <h2 className="mt-3 text-base font-semibold text-ink-900">Verify identity</h2>
        <p className="mt-1 max-w-[280px] text-sm text-muted">
          Capture a face or use manual lookup. The candidate is shown here for
          volunteer confirmation before a pass can be issued.
        </p>
      </section>
    )
  }

  const pct = confidence === null ? null : Math.round(confidence * 100)
  const belowThreshold = confidence !== null && confidence < threshold
  const status = alreadyCheckedIn
    ? { tone: 'grey', label: 'Already checked in' }
    : alreadyArrived
      ? { tone: 'amber', label: 'Already arrived' }
      : { tone: 'teal', label: 'Ready for arrival' }

  const blocked = alreadyArrived || alreadyCheckedIn
  const needsReason = requireReason || manual || belowThreshold
  const canIssue = confirmed && !blocked && !issuing && (!needsReason || Boolean(reason))
  const disabledHint = !confirmed
    ? 'Confirm the person in the candidate list first.'
    : needsReason && !reason
      ? 'Choose which ID you checked before issuing.'
      : null

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-paper shadow-sm">
      <div className="flex min-h-11 items-center justify-between gap-2 border-b border-border px-4">
        <h2 className="text-[13px] font-semibold tracking-[-0.005em] text-ink-900">
          Verify identity
        </h2>
        <Badge tone={manual ? 'amber' : 'neutral'} className="text-[10px]">
          {manual ? 'Manual fallback' : 'Synced record'}
        </Badge>
      </div>

      <div className="flex-1 space-y-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <PersonPhoto participant={participant} />
          <div className="min-w-0">
            <h1 className="truncate text-[19px] font-semibold leading-tight tracking-[-0.02em] text-ink-900">
              {participant.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] text-muted">
              <span className="font-mono text-slate-700">AIS26-P-{String(participant.id).padStart(4, '0')}</span>
              {participant.category && <span aria-hidden="true">·</span>}
              {participant.category && <span>{participant.category}</span>}
              {participant.institution && <span aria-hidden="true">·</span>}
              {participant.institution && (
                <span className="truncate">{participant.institution}</span>
              )}
            </p>
          </div>
        </div>

        {pct !== null ? (
          <div
            className={cn(
              'grid grid-cols-[70px_1fr] items-center gap-3 rounded-sm border px-3 py-2.5',
              belowThreshold
                ? 'border-amber-600/25 bg-amber-100'
                : 'border-teal-500/20 bg-teal-100'
            )}
          >
            <div>
              <p
                className={cn(
                  'font-mono text-[26px] font-semibold leading-none tracking-[-0.03em]',
                  belowThreshold ? 'text-amber-600' : 'text-teal-600'
                )}
              >
                {pct}%
              </p>
              <p className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.11em] text-muted">
                Match
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.11em] text-muted">
                Face match confidence
              </p>
              <div
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label="Face match confidence"
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-900/10"
              >
                <span
                  className={cn(
                    'block h-full rounded-full',
                    belowThreshold ? 'bg-amber-600' : 'bg-teal-500'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[9.5px] text-muted">
                {belowThreshold
                  ? `Below the ${Math.round(threshold * 100)}% threshold · check photo ID`
                  : `Above the ${Math.round(threshold * 100)}% threshold · volunteer confirmation still required`}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-sm border border-amber-600/25 bg-amber-100 px-3 py-2 text-[11.5px] text-amber-600">
            <strong className="font-semibold">Manual fallback</strong> — no face score.
            Check the participant&apos;s photo ID before issuing.
          </div>
        )}

        <div>
          <DataRow label="Email">{participant.email || 'Not recorded'}</DataRow>
          <DataRow label="Institution">
            {participant.institution || 'Not recorded'}
          </DataRow>
          <DataRow label="Category">
            <strong className="font-semibold text-ink-900">
              {participant.category || 'Not recorded'}
            </strong>
          </DataRow>
          <DataRow label="Record" last>
            <Badge tone={status.tone} dot className="text-[9.5px]">
              {status.label}
            </Badge>
          </DataRow>
        </div>

        <div className="flex items-start gap-2 pt-1">
          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-xs bg-teal-500 text-white">
            <Check className="h-3 w-3" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-ink-900">
              Participant consented to face verification
            </p>
            <p className="mt-0.5 text-[9.5px] leading-snug text-muted">
              Consent recorded at registration · purpose: event access only
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-2.5">
          <p className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-muted">
            After issuing
          </p>
          {AFTER_ROWS.map((row, index) => (
            <div
              key={row.title}
              className={cn(
                'flex items-start gap-2 py-1.5',
                index < AFTER_ROWS.length - 1 && 'border-b border-border'
              )}
            >
              <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-border-strong font-mono text-[8px] text-muted">
                {index + 1}
              </span>
              <div>
                <p className="text-[10.5px] font-semibold text-ink-900">{row.title}</p>
                <p className="mt-0.5 text-[9.5px] leading-snug text-muted">{row.body}</p>
              </div>
            </div>
          ))}
        </div>

        {needsReason && (
          <Select
            label="Which ID did you check?"
            placeholder="Choose one…"
            value={reason}
            onChange={(event) => onReasonChange?.(event.target.value)}
            options={REASONS.map((option) => ({ value: option, label: option }))}
            helper="Required for a manual or low-confidence match."
          />
        )}

        {alreadyCheckedIn && (
          <Banner tone="info" title="Already checked in">
            {alreadyCheckedInAt ? `Entry recorded at ${alreadyCheckedInAt}. ` : 'Entry is already recorded. '}
            Do not issue a duplicate pass — use “View record” instead.
          </Banner>
        )}

        {alreadyArrived && !alreadyCheckedIn && (
          <Banner tone="warning" title="Already arrived">
            {alreadyArrivedAt ? `Arrived at ${alreadyArrivedAt}. ` : ''}
            The pass may already be issued. Check the record before issuing another.
          </Banner>
        )}

        {issueError && (
          <Banner tone="error" title="Pass could not be issued">
            {issueError}
          </Banner>
        )}

        {backendPending && (
          <WaitingForBackend endpoints={['POST /api/arrivals', 'POST /api/qr/issue']} />
        )}
      </div>

      <div className="border-t border-border bg-[#FCF9F2] px-4 pt-3 pb-3.5">
        <Button
          variant="gold"
          size="lg"
          onClick={onIssue}
          disabled={!canIssue || backendPending}
          loading={issuing}
          className="w-full text-[14px]"
        >
          <Ticket className="h-4 w-4" aria-hidden="true" />
          Issue QR pass
        </Button>
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" size="sm" onClick={onPrint} className="flex-1">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print badge
          </Button>
          <Button variant="secondary" size="sm" onClick={onViewRecord} className="flex-1">
            <CircleUserRound className="h-3.5 w-3.5" aria-hidden="true" />
            View record
          </Button>
        </div>
        {disabledHint && (
          <p className="mt-2 text-center text-[10px] text-amber-600">{disabledHint}</p>
        )}
        <p className="mt-2 text-center text-[10px] text-muted">
          Face match wrong or camera unavailable?{' '}
          <a
            href={manualHref}
            className="font-semibold text-ink-900 underline underline-offset-2"
          >
            Use manual fallback
          </a>
        </p>
      </div>

      <p className="flex items-center gap-1.5 border-t border-border px-4 py-2.5 text-[9.5px] text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
        Every verification and pass issue is written to the audit log.
      </p>
    </section>
  )
}

export default IssuePass
