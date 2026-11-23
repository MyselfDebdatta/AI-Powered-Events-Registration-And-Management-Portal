import { useState } from 'react'
import { AlertTriangle, UserRound } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

/**
 * CandidateList — the face-match candidates, never auto-selected (§7.5).
 *
 * The volunteer confirms identity with the photo plus a secondary identifier.
 * A low score is an amber warning, not a rejection: the API decides the
 * threshold, and the human still has to press "This is the person".
 */

function CandidatePhoto({ participant }) {
  const [failed, setFailed] = useState(false)
  const showImage = participant?.photoUrl && !failed

  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-sand-200 text-sand-300">
      {showImage ? (
        <img
          src={participant.photoUrl.startsWith('/') || participant.photoUrl.startsWith('http')
            ? participant.photoUrl
            : `/${participant.photoUrl}`}
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

export function CandidateList({
  candidates = [],
  threshold = 0.4,
  lowConfidence = false,
  selectedId = null,
  onConfirm,
  className,
}) {
  if (candidates.length === 0) return null

  return (
    <section aria-label="Match candidates" className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.09em] text-muted">
          Candidate{candidates.length === 1 ? '' : 's'}
        </h3>
        <span className="text-[10.5px] text-muted">
          Volunteer confirmation required
        </span>
      </div>

      {lowConfidence && (
        <div className="flex items-start gap-2 rounded-sm border border-amber-600/30 bg-amber-100 px-3 py-2 text-[12px] text-amber-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Low confidence.</strong> Check a photo ID
            before issuing.
          </span>
        </div>
      )}

      <ul className="space-y-2">
        {candidates.map(({ participant, score }) => {
          const pct = score === null ? null : Math.round(score * 100)
          const belowThreshold = score !== null && score < threshold
          const selected = participant.id === selectedId
          return (
            <li
              key={participant.id}
              data-selected={selected || undefined}
              className={cn(
                'rounded-md border bg-paper p-3 transition-colors',
                selected ? 'border-teal-500 ring-1 ring-teal-500/25' : 'border-border'
              )}
            >
              <div className="flex items-start gap-3">
                <CandidatePhoto participant={participant} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {participant.name}
                  </p>
                  <p className="truncate text-[11.5px] text-muted">
                    {participant.institution || participant.email || 'No institution recorded'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {pct !== null ? (
                      <Badge tone={belowThreshold ? 'amber' : 'teal'}>
                        {pct}% match
                      </Badge>
                    ) : (
                      <Badge tone="grey">Manual fallback</Badge>
                    )}
                    {participant.category && (
                      <span className="text-[10.5px] text-muted">{participant.category}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant={selected ? 'secondary' : 'primary'}
                  size="sm"
                  aria-pressed={selected}
                  onClick={() => onConfirm?.(participant)}
                  className="shrink-0"
                >
                  {selected ? 'Confirmed' : 'This is the person'}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default CandidateList
