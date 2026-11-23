import { useState } from 'react'
import {
  AlertTriangle,
  CameraOff,
  CheckCircle2,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  UserRound,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'
import WaitingForBackend from './WaitingForBackend'

/**
 * ScanResult — the one unambiguous result panel (§7.6).
 * Labels are large enough to read at 2m; colour is paired with an icon and
 * text, and the next action is always present. The camera is replaced by this
 * panel, not covered by a toast.
 */

const STATES = {
  valid: {
    tone: 'teal',
    icon: CheckCircle2,
    label: (mode) => (mode === 'session' ? 'Attendance recorded' : 'Entry recorded'),
  },
  duplicate: {
    tone: 'amber',
    icon: AlertTriangle,
    label: (mode) =>
      mode === 'session' ? 'Already marked for this session' : 'Already checked in',
  },
  invalid: {
    tone: 'red',
    icon: XCircle,
    label: () => 'Invalid pass',
  },
  expired: {
    tone: 'red',
    icon: XCircle,
    label: () => 'Pass expired',
  },
  'wrong-scope': {
    tone: 'red',
    icon: ShieldAlert,
    label: () => 'Wrong pass for this checkpoint',
  },
  offline: {
    tone: 'amber',
    icon: WifiOff,
    label: () => 'Saved offline',
  },
  'backend-pending': {
    tone: 'amber',
    icon: AlertTriangle,
    label: () => 'Verification unavailable',
  },
  'camera-error': {
    tone: 'red',
    icon: CameraOff,
    label: () => 'Camera unavailable',
  },
}

const TONE = {
  teal: {
    panel: 'border-teal-500/40 bg-teal-100',
    label: 'text-teal-600',
    icon: 'text-teal-600',
  },
  amber: {
    panel: 'border-amber-600/40 bg-amber-100',
    label: 'text-amber-600',
    icon: 'text-amber-600',
  },
  red: {
    panel: 'border-red-600/40 bg-red-100',
    label: 'text-red-600',
    icon: 'text-red-600',
  },
}

function Participant({ participant }) {
  const [failed, setFailed] = useState(false)
  if (!participant) return null
  const src = participant.photoUrl
  const usable = src && !failed

  return (
    <div className="mt-3 flex items-center gap-3 rounded-sm bg-white/55 p-2.5">
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-sand-200 text-sand-300">
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
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-ink-900">{participant.name}</p>
        <p className="truncate text-[11.5px] text-slate-700">
          {participant.institution || participant.category || 'Participant'}
        </p>
      </div>
    </div>
  )
}

export function ScanResult({
  state = 'invalid',
  mode = 'entry',
  participant = null,
  reason = null,
  pendingCount = 0,
  onScanNext,
  onManualLookup,
  onViewRecord,
  onRetry,
  onIssueNew,
}) {
  const config = STATES[state] ?? STATES.invalid
  const tone = TONE[config.tone]
  const Icon = config.icon

  return (
    <section
      role={state === 'invalid' || state === 'expired' || state === 'wrong-scope' ? 'alert' : 'status'}
      aria-live="assertive"
      data-scan-state={state}
      className={cn('overflow-hidden rounded-md border-2 shadow-sm', tone.panel)}
    >
      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <Icon className={cn('mt-0.5 h-8 w-8 shrink-0', tone.icon)} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className={cn('text-[22px] font-semibold leading-tight tracking-[-0.02em]', tone.label)}>
              {config.label(mode)}
            </p>
            {reason && (
              <p className="mt-1 text-[13.5px] leading-snug text-slate-700">{reason}</p>
            )}
            {state === 'offline' && (
              <p className="mt-1 text-[13px] font-medium text-amber-600">
                {pendingCount} scan{pendingCount === 1 ? '' : 's'} pending sync. It is not
                verified until the hub reconnects.
              </p>
            )}
          </div>
        </div>

        <Participant participant={participant} />

        {state === 'backend-pending' && (
          <div className="mt-3">
            <WaitingForBackend endpoints={['POST /api/qr/verify']} title="Pass verification is not live yet" />
          </div>
        )}

        {state === 'wrong-scope' && (
          <p className="mt-3 rounded-sm bg-white/55 px-3 py-2 text-[12px] text-slate-700">
            Check the pass scope: an entry pass only works at entry, and a session pass only
            at the session it was issued for.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-ink-900/10 bg-white/45 px-4 py-3 sm:flex-row">
        {state === 'camera-error' && onRetry && (
          <Button variant="secondary" size="md" onClick={onRetry} className="sm:flex-1">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry camera
          </Button>
        )}
        {state === 'duplicate' && onViewRecord && (
          <Button variant="secondary" size="md" onClick={onViewRecord} className="sm:flex-1">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            View record
          </Button>
        )}
        {state === 'expired' && onIssueNew && (
          <Button variant="secondary" size="md" onClick={onIssueNew} className="sm:flex-1">
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            Issue a new pass at the desk
          </Button>
        )}
        {(state === 'invalid' ||
          state === 'wrong-scope' ||
          state === 'camera-error' ||
          state === 'backend-pending') &&
          onManualLookup && (
            <Button variant="secondary" size="md" onClick={onManualLookup} className="sm:flex-1">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Manual lookup
            </Button>
          )}
        {onScanNext && (
          <Button size="md" onClick={onScanNext} className="sm:flex-1">
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            Scan next
          </Button>
        )}
      </div>
    </section>
  )
}

export default ScanResult
