import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Camera,
  Check,
  RefreshCw,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Upload,
  UserRound,
  WifiOff,
  XCircle,
} from 'lucide-react'
import client, { normalizeError } from '../../api/client'
import flags from '../../content/flags'
import { useCamera } from '../../hooks/useCamera'
import { useDesk } from '../../hooks/useDesk'
import { useSyncQueue } from '../../hooks/useSyncQueue'
import {
  issuePass,
  isEndpointMissing,
  isOffline,
  markArrival,
  matchFace,
  normalizeParticipant,
} from '../../lib/arrivalApi'
import { addRecent, enqueue, newClientEventId, readRecent } from '../../lib/outbox'
import { Badge } from '../../components/ui/Badge'
import { Banner } from '../../components/ui/Banner'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Skeleton } from '../../components/ui/Skeleton'
import { Table } from '../../components/ui/Table'
import BadgePrint from '../../components/ticket/BadgePrint'
import CandidateList from '../../components/volunteer/CandidateList'
import IssuePass from '../../components/volunteer/IssuePass'
import PassIssued from '../../components/volunteer/PassIssued'
import SyncStatus from '../../components/volunteer/SyncStatus'
import WaitingForBackend from '../../components/volunteer/WaitingForBackend'

/**
 * Arrival — `/volunteer/arrival` (§7.5, mockup 06).
 *
 * One screen, three steps: find the participant (face or manual), verify with
 * a human confirmation, then issue the pass. Gold appears only on "Issue QR
 * pass"; every other action is ink or outline. Writes go to the local outbox
 * when the hub is unreachable and no success state is claimed until a signed
 * token comes back.
 */

const PANEL_HEAD =
  'flex min-h-11 items-center justify-between gap-2 rounded-t-md border-b border-border px-4'

/** Light-on-ink control for the camera panel (§7.5). */
const ON_DARK =
  'border-ivory-100/30 bg-ivory-100/10 text-ivory-50 hover:bg-ivory-100/20 hover:text-ivory-50 active:bg-ivory-100/25'

function formatTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatStamp(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function panelBadge(state) {
  switch (state) {
    case 'ready':
      return { tone: 'teal', label: 'Camera ready' }
    case 'starting':
      return { tone: 'amber', label: 'Starting camera…' }
    case 'denied':
    case 'no-camera':
    case 'in-use':
    case 'unsupported':
    case 'error':
      return { tone: 'red', label: 'Camera unavailable' }
    default:
      return { tone: 'grey', label: 'Camera off' }
  }
}

function Stepper({ match, selected, issued }) {
  const steps = [
    {
      label: 'Find participant',
      short: 'Find',
      state: match ? 'done' : 'current',
    },
    {
      label: 'Verify identity',
      short: 'Verify',
      state: issued ? 'done' : match ? (selected ? 'done' : 'current') : 'upcoming',
    },
    {
      label: 'Issue pass',
      short: 'Issue',
      state: issued ? 'done' : selected ? 'current' : 'upcoming',
    },
  ]

  return (
    <nav aria-label="Arrival steps" className="overflow-x-auto border-b border-border bg-paper">
      <ol className="flex min-h-12 items-center gap-0 px-2 sm:px-4">
        {steps.map((step, index) => (
          <li
            key={step.label}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="flex shrink-0 items-center gap-1.5 border-r border-border px-2 py-2 last:border-r-0 sm:gap-2 sm:px-5"
          >
            <span
              aria-hidden="true"
              className={
                step.state === 'done'
                  ? 'grid h-5 w-5 place-items-center rounded-full bg-gold-500 font-mono text-[9px] text-ink-900'
                  : step.state === 'current'
                    ? 'grid h-5 w-5 place-items-center rounded-full border-2 border-ink-900 bg-paper font-mono text-[9px] text-ink-900'
                    : 'grid h-5 w-5 place-items-center rounded-full border border-border-strong font-mono text-[9px] text-muted'
              }
            >
              {step.state === 'done' ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <span
              className={
                step.state === 'upcoming'
                  ? 'text-[11px] text-muted sm:text-[12px]'
                  : 'text-[11px] font-semibold text-ink-900 sm:text-[12px]'
              }
            >
              <span className="sm:hidden">{step.short}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function CameraUnavailable({ camera, onUpload, onManual, analyzing }) {
  const retry = camera.retry
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 py-8 text-center text-ivory-50">
      <WifiOff className="h-8 w-8 text-gold-500" aria-hidden="true" />
      <p className="max-w-[340px] text-[13px] leading-relaxed text-ivory-100/80">
        {camera.error || 'The camera is not available.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={retry}
          disabled={analyzing}
          className={ON_DARK}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry camera
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onUpload}
          disabled={analyzing}
          className={ON_DARK}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          Upload photo
        </Button>
        <Button variant="secondary" size="sm" onClick={onManual} className={ON_DARK}>
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          Manual lookup
        </Button>
      </div>
    </div>
  )
}

export default function Arrival() {
  const camera = useCamera({ facingMode: 'user' })
  const { desk } = useDesk()
  const { queue, pending: pendingCount, online } = useSyncQueue()
  const [params, setParams] = useSearchParams()
  const manualId = params.get('participant')
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  const [analyzing, setAnalyzing] = useState(false)
  const [match, setMatch] = useState(null)
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const [issued, setIssued] = useState(null)
  const [issuing, setIssuing] = useState(false)
  const [backendPending, setBackendPending] = useState(false)
  const [issueError, setIssueError] = useState(null)
  const [matchError, setMatchError] = useState(null)
  const [badgeOpen, setBadgeOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [recent, setRecent] = useState(readRecent)
  const [clientEventId, setClientEventId] = useState(null)
  const [videoMeta, setVideoMeta] = useState(null)

  const manualQuery = useQuery({
    queryKey: ['volunteer', 'participant', manualId],
    queryFn: () => client.get(`/participants/${manualId}`).then((response) => response.data),
    enabled: Boolean(manualId),
    retry: false,
  })

  const attendanceQuery = useQuery({
    queryKey: ['volunteer', 'attendance-event'],
    queryFn: () => client.get('/attendance/event').then((response) => response.data),
    retry: false,
    staleTime: 15_000,
  })

  // A manual selection from the lookup screen becomes a candidate with no
  // face score; the volunteer still has to confirm and give a reason.
  useEffect(() => {
    if (!manualQuery.data) return
    const participant = normalizeParticipant(manualQuery.data)
    if (!participant) return
    const records = Array.isArray(attendanceQuery.data) ? attendanceQuery.data : []
    const eventAttendance = records.find(
      (entry) => entry.participant_id === participant.id
    )
    setMatch({
      matched: true,
      candidates: [{ participant, score: null }],
      threshold: 0.4,
      similarity: null,
      lowConfidence: false,
      alreadyArrived: Boolean(eventAttendance),
      alreadyArrivedAt: eventAttendance?.marked_at ?? null,
      alreadyCheckedIn: Boolean(eventAttendance),
      alreadyCheckedInAt: eventAttendance?.marked_at ?? null,
      message: null,
    })
    setSelected(null)
    setReason('')
    setIssued(null)
    setBackendPending(false)
    setIssueError(null)
    setMatchError(null)
  }, [manualQuery.data, attendanceQuery.data])

  useEffect(() => {
    if (!camera.ready) {
      setVideoMeta(null)
      return
    }
    const track = camera.videoRef.current?.srcObject?.getVideoTracks?.()[0]
    const settings = track?.getSettings?.()
    setVideoMeta({
      width: settings?.width ?? null,
      height: settings?.height ?? null,
      fps: settings?.frameRate ?? null,
    })
  }, [camera.ready, camera.state, camera.videoRef])

  const runMatch = useCallback(async (image) => {
    setAnalyzing(true)
    setMatchError(null)
    setMatch(null)
    setSelected(null)
    setIssued(null)
    setBackendPending(false)
    setIssueError(null)
    setReason('')
    try {
      const result = await matchFace(image)
      if (!result.matched || result.candidates.length === 0) {
        setMatch(result)
        setMatchError(result.message || 'No registered participant matched.')
      } else {
        setMatch(result)
      }
    } catch (error) {
      setMatchError(normalizeError(error).message)
    } finally {
      setAnalyzing(false)
    }
  }, [])

  const capture = () => {
    const video = camera.videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (!video.videoWidth) {
      setMatchError('The camera is still starting. Wait a moment and try again.')
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      setMatchError('This browser could not capture the frame. Upload a photo instead.')
      return
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMatchError('Could not capture a still. Retry or upload a photo.')
          return
        }
        runMatch(blob)
      },
      'image/jpeg',
      0.92
    )
  }

  const handleUpload = (event) => {
    const file = event.target.files?.[0]
    if (file) runMatch(file)
    event.target.value = ''
  }

  const confirmCandidate = (participant) => {
    setSelected(participant)
    setReason('')
    setIssued(null)
    setBackendPending(false)
    setIssueError(null)
    setClientEventId(newClientEventId())
  }

  const resetDesk = useCallback(() => {
    const wasReady = camera.ready
    setMatch(null)
    setSelected(null)
    setReason('')
    setIssued(null)
    setBackendPending(false)
    setIssueError(null)
    setMatchError(null)
    setClientEventId(null)
    if (manualId) setParams({}, { replace: true })
    if (wasReady) camera.retry()
  }, [camera, manualId, setParams])

  const queueCurrent = (meta) => {
    const id = clientEventId ?? newClientEventId()
    enqueue({
      id,
      kind: 'ARRIVAL',
      participant: {
        id: meta.participant.id,
        name: meta.participant.name,
        email: meta.participant.email,
        institution: meta.participant.institution,
        category: meta.participant.category,
      },
      confidence: meta.similarity,
      method: meta.method,
      reason: meta.reason,
      desk: desk.id,
      station: desk.station,
      scope: 'ENTRY',
    })
    addRecent({
      participantId: meta.participant.id,
      name: meta.participant.name,
      status: 'Pending sync',
      tone: 'amber',
    })
    setRecent(readRecent())
    return id
  }

  const handleIssue = async () => {
    if (!selected || !match) return
    setIssueError(null)
    setBackendPending(false)

    const selectedMeta = match.candidates.find(
      (candidate) => candidate.participant.id === selected.id
    )
    const similarity = selectedMeta?.score ?? null
    const method = similarity === null ? 'MANUAL' : 'FACE'

    if (!flags.arrivalV2) {
      setBackendPending(true)
      return
    }

    if (!online) {
      queueCurrent({ participant: selected, similarity, method, reason })
      setIssued({ pending: true, participant: selected })
      return
    }

    setIssuing(true)
    const eventId = clientEventId ?? newClientEventId()
    try {
      await markArrival({
        participantId: selected.id,
        clientEventId: eventId,
        stationId: desk.station,
        deskId: desk.id,
        method,
        similarity,
        reason,
      })
      const pass = await issuePass({
        participantId: selected.id,
        clientEventId: eventId,
        stationId: desk.station,
        deskId: desk.id,
        scope: 'ENTRY',
      })
      setIssued({
        pending: false,
        participant: selected,
        token: pass.token,
        passId: pass.passId,
      })
      addRecent({
        participantId: selected.id,
        name: selected.name,
        status: 'Pass issued',
        tone: 'teal',
      })
      setRecent(readRecent())
    } catch (error) {
      if (isOffline(error)) {
        queueCurrent({ participant: selected, similarity, method, reason })
        setIssued({ pending: true, participant: selected })
      } else if (isEndpointMissing(error)) {
        setBackendPending(true)
      } else {
        setIssueError(normalizeError(error).message)
      }
    } finally {
      setIssuing(false)
    }
  }

  const recentRows = useMemo(() => {
    const queued = queue
      .filter((item) => item.kind !== 'SCAN')
      .map((item) => ({
        key: `q-${item.id}`,
        name: item.participant?.name || 'Participant',
        idLabel: item.participant?.id ? `#${item.participant.id}` : '—',
        time: formatTime(item.createdAt),
        status: 'Pending sync',
        tone: 'amber',
        sortAt: new Date(item.createdAt).getTime() || 0,
      }))

    const issuedRows = recent.map((item) => ({
      key: `r-${item.id}`,
      name: item.name || 'Participant',
      idLabel: item.participantId ? `#${item.participantId}` : '—',
      time: formatTime(item.at),
      status: item.status,
      tone: item.tone || 'teal',
      sortAt: new Date(item.at).getTime() || 0,
    }))

    const attendance = Array.isArray(attendanceQuery.data)
      ? attendanceQuery.data.map((item) => ({
          key: `a-${item.id}`,
          name: item.participant_name || 'Participant',
          idLabel: item.participant_id ? `#${item.participant_id}` : '—',
          time: formatTime(item.marked_at),
          status: 'Checked in',
          tone: 'grey',
          sortAt: new Date(item.marked_at).getTime() || 0,
        }))
      : []

    const merged = [...queued, ...issuedRows, ...attendance]
    const seen = new Set()
    return merged
      .filter((row) => {
        const dedupe = `${row.name}-${row.status}`
        if (seen.has(dedupe)) return false
        seen.add(dedupe)
        return true
      })
      .sort((a, b) => b.sortAt - a.sortAt)
      .slice(0, 5)
  }, [queue, recent, attendanceQuery.data])

  const badge = panelBadge(camera.state)
  const selectedMeta = selected
    ? match?.candidates?.find((candidate) => candidate.participant.id === selected.id)
    : null
  const similarity = selectedMeta?.score ?? null
  const manualSelection = Boolean(selectedMeta && selectedMeta.score === null)
  const needsReason = manualSelection || Boolean(match?.lowConfidence)

  const columns = [
    {
      key: 'name',
      label: 'Participant',
      primary: true,
      render: (value) => <span className="font-medium text-ink-900">{value}</span>,
    },
    {
      key: 'idLabel',
      label: 'ID',
      render: (value) => <span className="font-mono text-[11px]">{value}</span>,
    },
    { key: 'time', label: 'Time' },
    {
      key: 'status',
      label: 'Status',
      status: true,
      render: (value, row) => (
        <Badge tone={row.tone} dot className="text-[10px]">
          {value}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink-900">
            Arrival desk
          </h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Verify identity, then issue a pass. Gold means the pass is about to be issued.
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-[10.5px] text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-600" aria-hidden="true" />
          Volunteer confirmation required · <b className="font-semibold text-ink-900">{desk.station}</b>
        </p>
      </div>

      <section className="overflow-hidden rounded-md border border-border bg-paper shadow-sm">
        <Stepper match={match} selected={selected} issued={issued} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.36fr_1fr] lg:grid-rows-[auto_1fr]">
        <section className="flex flex-col rounded-md border border-border bg-paper shadow-sm lg:col-start-1 lg:row-start-1">
          <div className={PANEL_HEAD}>
            <h2 className="text-[13px] font-semibold text-ink-900">Live capture</h2>
            <div className="flex items-center gap-2">
              <Badge tone={badge.tone} dot className="text-[9.5px]">
                {badge.label}
              </Badge>
              <span className="font-mono text-[9.5px] text-muted">CAM · {desk.station}</span>
            </div>
          </div>

          <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-900 sm:aspect-[4/3]">
            {camera.state === 'idle' && (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-ivory-50">
                <span className="grid h-14 w-14 place-items-center rounded-full border border-ivory-100/20 bg-ivory-100/5">
                  <ScanFace className="h-7 w-7 text-gold-500" aria-hidden="true" />
                </span>
                <p className="max-w-[320px] text-[13px] leading-relaxed text-ivory-100/80">
                  Start the camera when the participant is ready. Nothing is captured
                  until you press “Capture and verify”.
                </p>
                <Button variant="secondary" size="sm" onClick={camera.start} className={ON_DARK}>
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  Start camera
                </Button>
              </div>
            )}

            {camera.state === 'starting' && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-ivory-50">
                <RefreshCw className="h-7 w-7 animate-spin text-gold-500" aria-hidden="true" />
                <p className="text-[13px]">Starting camera…</p>
              </div>
            )}

            {camera.state === 'ready' && (
              <>
                <video
                  ref={camera.videoRef}
                  autoPlay
                  playsInline
                  muted
                  aria-label="Live camera preview for face verification"
                  className="h-full w-full scale-x-[-1] object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-[58%] w-[34%] min-w-[130px] rounded-[46px] border border-dashed border-gold-500/70">
                    <span className="absolute -left-px -top-px h-4 w-4 border-l-2 border-t-2 border-gold-500" />
                    <span className="absolute -right-px -top-px h-4 w-4 border-r-2 border-t-2 border-gold-500" />
                    <span className="absolute -bottom-px -left-px h-4 w-4 border-b-2 border-l-2 border-gold-500" />
                    <span className="absolute -bottom-px -right-px h-4 w-4 border-b-2 border-r-2 border-gold-500" />
                  </div>
                </div>
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-xs border border-ivory-100/20 bg-ink-900/75 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-ivory-50">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
                  Live{videoMeta?.fps ? ` · ${Math.round(videoMeta.fps)} fps` : ''}
                </span>
                <span className="absolute right-3 top-3 rounded-xs border border-teal-500/30 bg-teal-500/20 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-teal-100">
                  {videoMeta?.width && videoMeta.width >= 640 ? 'Quality good' : 'Checking quality'}
                </span>
                <span className="absolute inset-x-3 bottom-3 mx-auto w-fit rounded-xs border border-ivory-100/15 bg-ink-900/75 px-2.5 py-1 text-center text-[10px] leading-snug text-ivory-100/80">
                  Ask the participant to face the camera and remove glasses.
                </span>
              </>
            )}

            {['denied', 'no-camera', 'in-use', 'unsupported', 'error'].includes(camera.state) && (
              <CameraUnavailable
                camera={camera}
                analyzing={analyzing}
                onUpload={() => fileInputRef.current?.click()}
                onManual={() => setParams({}, { replace: true })}
              />
            )}

            {analyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-900/70 text-ivory-50">
                <RefreshCw className="h-8 w-8 animate-spin text-gold-500" aria-hidden="true" />
                <p className="text-[13px] font-medium">Matching face…</p>
              </div>
            )}
          </div>

          <div className="hidden flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 sm:flex">
            <div className="flex items-center gap-3">
              {camera.ready ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMatch(null)
                    setSelected(null)
                    setMatchError(null)
                    camera.retry()
                  }}
                  disabled={analyzing}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retake
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={camera.start} disabled={analyzing}>
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  Start camera
                </Button>
              )}
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-teal-600">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
                {camera.ready ? 'Camera ready' : 'Camera off'}
              </span>
            </div>
            <p className="max-w-[260px] text-[9px] leading-snug text-muted">
              No photo leaves this station until the pass is issued. Offline capture is
              supported.
            </p>
          </div>

          <div className="grid grid-cols-2 items-center gap-2 rounded-b-md border-t border-border bg-[#FCF9F2] px-4 py-2.5 sm:flex sm:flex-wrap">
            <Button
              onClick={capture}
              disabled={!camera.ready || analyzing}
              size="md"
              className="col-span-2 w-full sm:w-auto"
            >
              <ScanFace className="h-4 w-4" aria-hidden="true" />
              Capture and verify
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
              className="w-full whitespace-nowrap sm:w-auto"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload photo
            </Button>
            <Link
              to="/volunteer/manual?mode=entry"
              className="inline-flex min-h-11 items-center justify-center text-[11px] font-semibold text-ink-900 underline underline-offset-2 sm:ml-auto sm:min-h-0"
            >
              Manual lookup
            </Link>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </section>

        <div className="flex flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {manualQuery.isLoading && (
            <Skeleton variant="card" className="h-72" />
          )}

          {manualQuery.isError && (
            <Banner
              tone="error"
              title="Participant could not be loaded"
              action={
                <Button variant="secondary" size="sm" onClick={() => manualQuery.refetch()}>
                  Retry
                </Button>
              }
            >
              {normalizeError(manualQuery.error).status === 404
                ? 'No participant has that ID. Search again from manual lookup.'
                : 'Check the connection and retry, or search manually.'}
            </Banner>
          )}

          {issued ? (
            <PassIssued
              participant={issued.participant}
              token={issued.token}
              passId={issued.passId}
              pending={issued.pending}
              pendingCount={pendingCount}
              onNext={resetDesk}
              onPrint={() => setBadgeOpen(true)}
            />
          ) : (
            <div className="flex flex-1 flex-col gap-3">
              {match?.candidates?.length > 0 && (
                <CandidateList
                  candidates={match.candidates}
                  threshold={match.threshold}
                  lowConfidence={match.lowConfidence}
                  selectedId={selected?.id ?? null}
                  onConfirm={confirmCandidate}
                />
              )}

              {matchError ? (
                <section className="rounded-md border border-border bg-paper p-5 text-center shadow-sm">
                  <XCircle className="mx-auto h-8 w-8 text-red-600" aria-hidden="true" />
                  <h2 className="mt-2 text-base font-semibold text-ink-900">
                    No registered participant matched
                  </h2>
                  <p className="mx-auto mt-1 max-w-[320px] text-sm text-muted">{matchError}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button variant="secondary" size="md" onClick={() => setMatchError(null)}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Retry
                    </Button>
                    <Link
                      to="/volunteer/manual?mode=entry"
                      className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border-control px-4 text-sm font-medium text-ink-900 hover:bg-sand-100"
                    >
                      <UserRound className="h-4 w-4" aria-hidden="true" />
                      Manual lookup
                    </Link>
                  </div>
                </section>
              ) : (
                <IssuePass
                  participant={selected}
                  confidence={similarity}
                  threshold={match?.threshold ?? 0.4}
                  manual={manualSelection}
                  confirmed={Boolean(selected)}
                  reason={reason}
                  onReasonChange={setReason}
                  requireReason={needsReason}
                  alreadyArrived={Boolean(match?.alreadyArrived)}
                  alreadyArrivedAt={formatStamp(match?.alreadyArrivedAt)}
                  alreadyCheckedIn={Boolean(match?.alreadyCheckedIn)}
                  alreadyCheckedInAt={formatStamp(match?.alreadyCheckedInAt)}
                  onIssue={handleIssue}
                  issuing={issuing}
                  backendPending={backendPending}
                  issueError={issueError}
                  onPrint={() => setBadgeOpen(true)}
                  onViewRecord={() => setRecordOpen(true)}
                />
              )}

              {backendPending && (
                <p className="text-center text-[10.5px] text-muted">
                  Manual fallback still works for lookup; a pass cannot be issued until the
                  arrival service is live.
                </p>
              )}
            </div>
          )}
        </div>

        <section className="overflow-hidden rounded-md border border-border bg-paper shadow-sm lg:col-start-1 lg:row-start-2">
          <div className="flex min-h-11 items-center justify-between gap-2 border-b border-border px-4">
            <h2 className="text-[13px] font-semibold text-ink-900">Recent arrivals</h2>
            <span className="text-[10px] text-muted">Latest {recentRows.length || 5}</span>
          </div>
          <div className="p-3">
            <Table
              columns={columns}
              data={recentRows}
              emptyMessage="No arrivals yet"
              emptyBody="Issued passes, pending captures and check-ins appear here."
              showCount={false}
            />
          </div>
          <SyncStatus
            variant="bar"
            pending={pendingCount}
            online={online}
          />
        </section>
      </div>

      <Dialog
        open={badgeOpen}
        onClose={() => setBadgeOpen(false)}
        title="Print badge"
        description="CR80 badge · 85.6 × 54 mm. The QR only prints for an issued pass."
        size="md"
      >
        <BadgePrint
          participant={issued?.participant ?? selected}
          passId={issued?.passId ?? null}
          token={issued?.token ?? null}
          deskLabel={desk.label}
          station={desk.station}
        />
      </Dialog>

      <Dialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Participant record"
        description="The same record the arrival station synced."
        size="md"
      >
        {selected ? (
          <dl className="space-y-2 text-sm">
            {[
              ['Name', selected.name],
              ['Participant ID', `#${selected.id}`],
              ['Email', selected.email || 'Not recorded'],
              ['Phone', selected.phone || 'Not recorded'],
              ['Institution', selected.institution || 'Not recorded'],
              ['Category', selected.category || 'Not recorded'],
              ['Registered', selected.registeredAt ? formatStamp(selected.registeredAt) : 'Not recorded'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-b-0">
                <dt className="shrink-0 text-xs text-muted">{label}</dt>
                <dd className="text-right font-medium text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted">No participant is selected.</p>
        )}
      </Dialog>
    </div>
  )
}
