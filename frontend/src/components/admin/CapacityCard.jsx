import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { Skeleton } from '../ui/Skeleton'
import { CalendarDays } from 'lucide-react'

const BAR_TONE = { teal: 'bg-teal-500', amber: 'bg-amber-600' }

/** CapacityCard — session capacity from live `/sessions/` records. */
export function CapacityCard({ sessions = [], loading = false }) {
  return (
    <Card variant="paper" padded className="p-3 h-[236px]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-900">Session capacity</div>
          <div className="mt-0.5 text-[8.5px] text-muted">Checked in / room capacity</div>
        </div>
        <Link to="/admin/sessions" className="text-[8.5px] font-semibold text-ink-900 underline underline-offset-2">
          Manage
        </Link>
      </div>
      {loading ? (
        <Skeleton variant="card" className="h-20" />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No sessions yet"
          body="Create sessions to track capacity."
          action={
            <Link
              to="/admin/sessions"
              className="inline-flex min-h-9 items-center justify-center rounded-sm bg-ink-900 px-3 text-xs font-medium text-ivory-50 hover:bg-ink-800"
            >
              Create session
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const checkedIn = Number(session.checked_in_count ?? session.attendance_count ?? 0)
            const capacity = Number(session.capacity ?? session.max_attendees ?? 0)
            const share = capacity ? Math.round((checkedIn / capacity) * 100) : 0
            return (
              <div key={session.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-[9px]">
                  <span className="truncate font-medium text-ink-900">{session.name}</span>
                  <span className="shrink-0 font-mono text-[8.5px] text-muted">
                    {capacity ? `${checkedIn} / ${capacity}` : 'No capacity set'}
                  </span>
                </div>
                {capacity > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-sand-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${share >= 90 ? BAR_TONE.amber : BAR_TONE.teal}`}
                      style={{ width: `${Math.min(100, share)}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export default CapacityCard
