import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Search,
  ShieldCheck,
  UserRound,
  UserX,
} from 'lucide-react'
import client, { normalizeError } from '../../api/client'
import { useDesk } from '../../hooks/useDesk'
import { Badge } from '../../components/ui/Badge'
import { Banner } from '../../components/ui/Banner'
import { Button } from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'

/**
 * ManualLookup — the fallback for lost passes, damaged prints and camera
 * failure (§7.5/§7.6).
 *
 * Entry mode hands the participant to the arrival desk: the volunteer still
 * confirms the person against a photo ID and records which ID was checked.
 * Session mode uses the live attendance endpoint and never claims more than
 * "attendance recorded".
 */

const MODES = {
  entry: {
    title: 'Manual lookup',
    body: 'Find the participant, then verify their photo ID at the arrival desk.',
    cta: 'Use for arrival',
  },
  session: {
    title: 'Manual check-in',
    body: 'Find the participant and record session attendance. Entry check-in happens at the arrival desk.',
    cta: 'Mark attendance',
  },
}

function PersonPhoto({ participant }) {
  const [failed, setFailed] = useState(false)
  const src = participant?.photo_url
  const usable = src && !failed
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-sand-200 text-sand-300">
      {usable ? (
        <img
          src={src.startsWith('/') || src.startsWith('http') ? src : `/${src}`}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <UserRound className="h-5 w-5" aria-hidden="true" />
      )}
    </span>
  )
}

export default function ManualLookup() {
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'session' ? 'session' : 'entry'
  const copy = MODES[mode]
  const { desk } = useDesk()

  const [search, setSearch] = useState('')
  const [sessionId, setSessionId] = useState(params.get('session') ?? '')
  const [markingId, setMarkingId] = useState(null)
  const [result, setResult] = useState(null)
  const [sessionError, setSessionError] = useState(null)

  useEffect(() => {
    setSessionId(params.get('session') ?? '')
    setResult(null)
  }, [params])

  const { data: sessions } = useQuery({
    queryKey: ['volunteer', 'sessions'],
    queryFn: () => client.get('/sessions/').then((response) => response.data),
    enabled: mode === 'session',
    retry: false,
  })

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['volunteer', 'participant-search', search],
    queryFn: () =>
      client
        .get('/participants/', { params: { search: search.trim(), limit: 10 } })
        .then((response) => response.data),
    enabled: search.trim().length >= 2,
    retry: false,
  })

  const items = Array.isArray(data?.items) ? data.items : []

  const markAttendance = async (participant) => {
    if (!sessionId) {
      setSessionError('Choose the session before marking attendance.')
      return
    }
    setSessionError(null)
    setMarkingId(participant.id)
    setResult(null)
    try {
      await client.post('/attendance/', {
        participant_id: participant.id,
        session_id: Number(sessionId),
        method: 'MANUAL',
      })
      setResult({
        tone: 'success',
        title: 'Attendance recorded',
        body: `${participant.name} is marked for this session.`,
        participant,
      })
    } catch (attendanceError) {
      if (attendanceError?.response?.status === 409) {
        setResult({
          tone: 'warning',
          title: 'Already marked for this session',
          body: `${participant.name} already has attendance for this session. No duplicate was written.`,
          participant,
        })
      } else {
        setResult({
          tone: 'error',
          title: 'Attendance could not be recorded',
          body: normalizeError(attendanceError).message,
          participant: null,
        })
      }
    } finally {
      setMarkingId(null)
    }
  }

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
            {copy.title}
          </h1>
          <p className="text-[11px] text-muted">
            {copy.body} {desk.label} · {desk.station}
          </p>
        </div>
        <Badge tone={mode === 'session' ? 'teal' : 'neutral'} className="shrink-0">
          {mode === 'session' ? 'Session' : 'Entry'}
        </Badge>
      </div>

      <div
        role="group"
        aria-label="Lookup purpose"
        className="grid grid-cols-2 gap-1 rounded-md border border-border bg-sand-100 p-1"
      >
        <Link
          to="/volunteer/manual?mode=entry"
          aria-current={mode === 'entry' ? 'page' : undefined}
          className={
            mode === 'entry'
              ? 'flex min-h-10 items-center justify-center rounded-sm bg-paper text-sm font-semibold text-ink-900 shadow-sm'
              : 'flex min-h-10 items-center justify-center rounded-sm text-sm font-medium text-muted hover:text-ink-900'
          }
        >
          Entry / arrival
        </Link>
        <Link
          to="/volunteer/manual?mode=session"
          aria-current={mode === 'session' ? 'page' : undefined}
          className={
            mode === 'session'
              ? 'flex min-h-10 items-center justify-center rounded-sm bg-paper text-sm font-semibold text-ink-900 shadow-sm'
              : 'flex min-h-10 items-center justify-center rounded-sm text-sm font-medium text-muted hover:text-ink-900'
          }
        >
          Session check-in
        </Link>
      </div>

      {mode === 'session' && (
        <Select
          label="Session"
          placeholder="Choose the session…"
          value={sessionId}
          onChange={(event) => {
            setSessionId(event.target.value)
            setSessionError(null)
            setResult(null)
          }}
          error={sessionError}
          helper="Attendance is once per participant per session."
          options={(sessions ?? []).map((session) => ({
            value: String(session.id),
            label: session.name,
          }))}
        />
      )}

      <div className="rounded-md border border-border bg-paper p-4 shadow-sm">
        <Input
          label="Search participants"
          icon={Search}
          placeholder="Name, email or participant ID (min 2 characters)"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setResult(null)
          }}
        />
        <p className="mt-2 flex items-start gap-1.5 text-[10.5px] text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" aria-hidden="true" />
          Manual fallback requires a photo ID check. Never mark someone on name alone.
        </p>
      </div>

      {result && (
        <Banner
          tone={result.tone}
          title={result.title}
          action={
            result.participant ? (
              <Badge tone={result.tone === 'success' ? 'teal' : 'amber'}>
                {result.participant.name}
              </Badge>
            ) : null
          }
        >
          {result.body}
        </Banner>
      )}

      {search.trim().length > 0 && search.trim().length < 2 && (
        <p className="text-center text-[11.5px] text-muted">
          Type at least 2 characters to search.
        </p>
      )}

      {search.trim().length >= 2 && (
        <section className="overflow-hidden rounded-md border border-border bg-paper shadow-sm">
          <div className="flex min-h-10 items-center justify-between gap-2 border-b border-border px-4">
            <h2 className="text-[12px] font-semibold text-ink-900">
              Results{items.length > 0 ? ` · ${items.length}` : ''}
            </h2>
            {isFetching && (
              <span className="text-[10px] text-muted" role="status">
                Searching…
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2 p-3">
              <Skeleton variant="card" className="h-16" />
              <Skeleton variant="card" className="h-16" />
            </div>
          ) : error ? (
            <div className="p-4">
              <Banner
                tone="error"
                title="Search failed"
                action={
                  <Button variant="secondary" size="sm" onClick={() => refetch()}>
                    Retry
                  </Button>
                }
              >
                {normalizeError(error).message}
              </Banner>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <UserX className="mx-auto h-7 w-7 text-sand-300" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-ink-900">No participant found</p>
              <p className="mt-1 text-[11.5px] text-muted">
                Try a different spelling, the email on the registration, or the participant ID.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((participant) => (
                <li
                  key={participant.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap"
                >
                  <PersonPhoto participant={participant} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink-900">
                      {participant.name}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      #{participant.id} · {participant.institution || participant.email}
                    </p>
                    {participant.category && (
                      <Badge tone="neutral" className="mt-1 text-[9.5px]">
                        {participant.category}
                      </Badge>
                    )}
                  </div>

                  {mode === 'entry' ? (
                    <Link
                      to={`/volunteer/arrival?participant=${participant.id}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-sm border border-border-control px-3 text-[12px] font-semibold text-ink-900 hover:bg-sand-100"
                    >
                      {copy.cta}
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => markAttendance(participant)}
                      loading={markingId === participant.id}
                      disabled={!sessionId}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {copy.cta}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {mode === 'session' && !sessionId && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Choose a session to enable “Mark attendance”.
        </p>
      )}
    </div>
  )
}
