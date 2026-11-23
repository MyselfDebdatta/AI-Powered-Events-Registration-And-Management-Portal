import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ListChecks,
  RefreshCw,
  ScanLine,
  Trash2,
  UserRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSyncQueue } from '../../hooks/useSyncQueue'
import { drainOutbox } from '../../lib/arrivalApi'
import { removeQueueItem } from '../../lib/outbox'
import flags from '../../content/flags'
import { Badge } from '../../components/ui/Badge'
import { Banner } from '../../components/ui/Banner'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import EmptyState from '../../components/ui/EmptyState'
import SyncStatus from '../../components/volunteer/SyncStatus'
import WaitingForBackend from '../../components/volunteer/WaitingForBackend'

/**
 * Queue — `/volunteer/queue` (§7.5/§7.6 offline states).
 *
 * Shows every write saved on this device, why it is still here, and a retry
 * that reuses the original `client_event_id`. Items disappear only when the
 * hub accepts them (or a volunteer explicitly discards one).
 */

function when(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

const STATUS = {
  pending: { tone: 'amber', label: 'Pending sync' },
  waiting: { tone: 'amber', label: 'Waiting for backend' },
  failed: { tone: 'red', label: 'Needs attention' },
}

export default function Queue() {
  const { queue, pending, online } = useSyncQueue()
  const [retrying, setRetrying] = useState(false)
  const [confirming, setConfirming] = useState(null)

  const retry = async () => {
    setRetrying(true)
    try {
      const summary = await drainOutbox()
      if (summary.processed > 0) {
        toast.success(`${summary.processed} record${summary.processed === 1 ? '' : 's'} synced`)
      } else if (summary.waiting > 0) {
        toast('Waiting for backend — nothing can sync yet', { icon: '⚠️' })
      } else if (summary.failed > 0) {
        toast(`Still offline — ${summary.pending} pending`, { icon: '⚠️' })
      } else {
        toast.success('Queue is empty')
      }
    } finally {
      setRetrying(false)
    }
  }

  const discard = () => {
    if (!confirming) return
    removeQueueItem(confirming.id)
    setConfirming(null)
    toast.success('Saved record discarded')
  }

  const endpointFlag = flags.arrivalV2 || flags.scanV2

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/volunteer/dashboard"
          className="grid h-9 w-9 place-items-center rounded-sm text-ink-900 hover:bg-sand-100"
          aria-label="Back to desk home"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[21px] font-semibold tracking-[-0.03em] text-ink-900">
            Pending sync
          </h1>
          <p className="text-[11px] text-muted">
            Saved on this device · {pending} {pending === 1 ? 'record' : 'records'}
          </p>
        </div>
        <SyncStatus pending={pending} online={online} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-paper p-3 shadow-sm">
        <Button size="md" onClick={retry} loading={retrying} disabled={!online || pending === 0}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry now
        </Button>
        <p className="text-[11px] text-muted">
          {online
            ? 'Retries reuse the original client event ID, so the hub cannot write a duplicate.'
            : 'The device is offline. Records stay safe here until the connection returns.'}
        </p>
      </div>

      {!endpointFlag && pending > 0 && (
        <WaitingForBackend
          title="Saved captures cannot sync yet"
          endpoints={['POST /api/arrivals', 'POST /api/qr/issue', 'POST /api/qr/verify']}
        />
      )}

      {pending === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing is waiting"
          body="Offline captures and scans appear here until the hub accepts them."
          action={
            <Link
              to="/volunteer/arrival"
              className="inline-flex min-h-11 items-center justify-center rounded-sm bg-ink-900 px-4 text-sm font-medium text-ivory-50 hover:bg-ink-800"
            >
              Back to the arrival desk
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {queue.map((item) => {
            const status = STATUS[item.status] ?? STATUS.pending
            const isScan = item.kind === 'SCAN'
            return (
              <li
                key={item.id}
                className="rounded-md border border-border bg-paper p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-sand-100 text-ink-700">
                    {isScan ? (
                      <ScanLine className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-semibold text-ink-900">
                        {isScan
                          ? `${item.scope === 'SESSION' ? 'Session' : 'Entry'} pass scan`
                          : item.participant?.name || 'Participant'}
                      </p>
                      <Badge tone={status.tone} dot className="text-[9.5px]">
                        {status.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {isScan
                        ? `Saved ${when(item.createdAt)} · ${item.station || 'station'}`
                        : `${item.participant?.id ? `#${item.participant.id}` : 'Participant'} · ${item.method === 'MANUAL' ? 'Manual' : 'Face'} verification · ${item.station || 'station'}`}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      Saved {when(item.createdAt)}
                      {item.attempts ? ` · ${item.attempts} attempt${item.attempts === 1 ? '' : 's'}` : ''}
                      {item.lastError ? ` · ${item.lastError}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirming(item)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-muted hover:bg-red-100 hover:text-red-600"
                    aria-label={`Discard record for ${isScan ? 'pass scan' : item.participant?.name || 'participant'}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Banner tone="info" title="Nothing is removed automatically">
        A record leaves this list only after the hub confirms it, or when a volunteer discards
        it here. Discarding an arrival means the participant must be verified again.
      </Banner>

      <Dialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title="Discard this saved record?"
        description="This cannot be undone. The hub has not received it."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={discard}>
              Discard record
            </Button>
          </>
        }
      >
        <p className="flex items-start gap-2 text-sm text-slate-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          {confirming?.kind === 'SCAN'
            ? 'The scan will be lost and the pass will need to be scanned again.'
            : 'The arrival verification will be lost and the participant will need to be verified again before a pass is issued.'}
        </p>
      </Dialog>
    </div>
  )
}
