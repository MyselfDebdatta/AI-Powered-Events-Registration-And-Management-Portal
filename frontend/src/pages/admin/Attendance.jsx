import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import client from '../../api/client'
import flags from '../../content/flags'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { Banner } from '../../components/ui/Banner'
import Select from '../../components/ui/Select'
import { RejectReason, VOID_REASONS } from '../../components/volunteer/VoidReason'
import { ClipboardCheck } from 'lucide-react'

const METHOD_TONE = { QR: 'teal', MANUAL: 'amber', FACE: 'gold' }

function fmt(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

/**
 * Attendance — event and session check-ins (Phase 4).
 * Void requires a reason and states the consequence; without the hub endpoint
 * the dialog shows "Waiting for backend" and performs no write (§5.3).
 */
export default function Attendance() {
  // View + session filters persist in query params (§12.2).
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'session' ? 'session' : 'event'
  const sessionId = params.get('session') ?? ''
  const setFilter = (patch) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, String(value))
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }
  const [voiding, setVoiding] = useState(null)
  const [reason, setReason] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['admin', 'attendance-stats'],
    queryFn: () => client.get('/attendance/stats').then((r) => r.data),
    retry: false,
  })
  const { data: sessionsData } = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => client.get('/sessions/').then((r) => r.data),
    retry: false,
  })
  const sessions = Array.isArray(sessionsData) ? sessionsData : []

  const { data: eventData, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['admin', 'event-attendance'],
    queryFn: () => client.get('/attendance/event').then((r) => r.data),
    enabled: tab === 'event',
    retry: false,
  })
  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['admin', 'session-attendance', sessionId],
    queryFn: () => client.get(`/attendance/session/${sessionId}`).then((r) => r.data),
    enabled: tab === 'session' && Boolean(sessionId),
    retry: false,
  })

  const rows = Array.isArray(tab === 'event' ? eventData : sessionData)
    ? (tab === 'event' ? eventData : sessionData)
    : []

  const columns = [
    { key: 'participant_name', label: 'Participant', primary: true, render: (v, row) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink-900">{v || `#${row.participant_id}`}</p>
        <p className="text-[10px] text-muted">#{row.participant_id}</p>
      </div>
    ) },
    ...(tab === 'session' ? [{ key: 'session_name', label: 'Session', render: (v) => v || '—' }] : []),
    { key: 'method', label: 'Method', status: true, render: (v) => (
      <Badge tone={METHOD_TONE[v] ?? 'grey'} className="text-[9.5px]">{v}</Badge>
    ) },
    { key: 'marked_at', label: 'Recorded', render: (v) => fmt(v) },
    { key: 'actions', label: 'Actions', actions: true, render: (_, row) => (
      <Button
        variant="secondary"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setVoiding(row); setReason('') }}
        aria-label={`Void record for ${row.participant_name || row.participant_id}`}
        className="text-[10px]"
      >
        Void
      </Button>
    ) },
  ]

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Attendance</h2>
        <p className="mt-0.5 text-[11px] text-muted">Event check-ins and session attendance, as recorded by the desk.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Card variant="paper" padded className="p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted">Participants</p>
            <p className="mt-1 text-xl font-bold text-ink-900">{stats.total_participants ?? 0}</p>
          </Card>
          <Card variant="paper" padded className="p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted">Checked in</p>
            <p className="mt-1 text-xl font-bold text-ink-900">{stats.total_checked_in ?? 0}</p>
          </Card>
          <Card variant="paper" padded className="p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted">Sessions</p>
            <p className="mt-1 text-xl font-bold text-ink-900">{stats.total_sessions ?? 0}</p>
          </Card>
          <Card variant="paper" padded className="p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted">Records</p>
            <p className="mt-1 text-xl font-bold text-ink-900">
              {Object.values(stats.attendance_by_method ?? {}).reduce((a, b) => a + b, 0)}
            </p>
          </Card>
        </div>
      )}

      <div role="group" aria-label="Attendance view" className="grid w-fit grid-cols-2 gap-1 rounded-md border border-border bg-sand-100 p-1">
        {[
          { id: 'event', label: 'Event check-ins' },
          { id: 'session', label: 'Session attendance' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => setFilter({ tab: item.id })}
            className={`min-h-10 rounded-sm px-4 text-[12px] font-medium ${tab === item.id ? 'bg-paper text-ink-900 shadow-sm' : 'text-muted hover:text-ink-900'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'session' && (
        <Select
          label="Session"
          placeholder="Choose a session…"
          value={sessionId}
          onChange={(e) => setFilter({ session: e.target.value })}
          options={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
          helper="Attendance is once per participant per session."
        />
      )}

      {(eventError || sessionError) && (
        <Banner tone="error" title="Attendance could not be loaded">
          Check the hub connection and retry.
        </Banner>
      )}

      <section className="overflow-hidden rounded-md border border-border bg-paper shadow-sm">
        {tab === 'session' && !sessionId ? (
          <p className="p-6 text-center text-[12px] text-muted">Choose a session to view its attendance.</p>
        ) : (
          <Table
            columns={columns}
            data={rows}
            loading={tab === 'event' ? eventLoading : sessionLoading}
            emptyMessage="No records yet"
            emptyBody="Check-ins recorded at the arrival desk appear here."
            showCount={false}
          />
        )}
      </section>

      <Dialog
        open={Boolean(voiding)}
        onClose={() => setVoiding(null)}
        title="Void this attendance record?"
        description="Voiding keeps an audit trail and removes the check-in."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVoiding(null)}>Keep record</Button>
            <Button
              variant="danger"
              disabled={!reason || !flags.voidAttendance}
              onClick={() => setVoiding(null)}
            >
              Void record
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="flex items-start gap-2 rounded-sm border border-amber-600/25 bg-amber-100 px-3 py-2 text-[11.5px] text-amber-600">
            <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {voiding?.participant_name || 'This participant'} will no longer count as checked in. The void is
            written to the audit log with your reason and cannot be undone here.
          </p>
          {!flags.voidAttendance && (
            <Banner tone="warning" title="Waiting for backend">
              The void endpoint is not live in this build. No record will be changed.
            </Banner>
          )}
          <RejectReason value={reason} onChange={setReason} options={VOID_REASONS} label="Reason for void" />
        </div>
      </Dialog>
    </div>
  )
}
