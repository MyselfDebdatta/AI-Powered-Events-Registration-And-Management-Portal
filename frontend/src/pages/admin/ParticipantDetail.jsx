import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import client from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { Skeleton } from '../../components/ui/Skeleton'
import { ArrowLeft, Mail, Phone, Building, Tag, Ticket, UserRound } from 'lucide-react'

const CATEGORY_TONE = {
  STUDENT: 'teal', RESEARCHER: 'gold', PROFESSIONAL: 'neutral', SPEAKER: 'ink', OTHER: 'grey',
}
const METHOD_TONE = { QR: 'teal', MANUAL: 'amber', FACE: 'gold' }

function fmtDate(value) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

/**
 * ParticipantDetail — one participant's record and attendance (Phase 4).
 * Uses GET /participants/{id}; status is described in words, never guessed.
 */
export default function ParticipantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: participant, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'participant', id],
    queryFn: () => client.get(`/participants/${id}`).then((r) => r.data),
    retry: false,
  })

  if (isLoading) return <Skeleton variant="card" className="h-96" />
  if (error || !participant) {
    return (
      <div className="space-y-3">
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
        </Button>
        <Banner tone="error" title="Participant could not be loaded" action={
          <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
        }>
          Check the connection, or return to the register and search again.
        </Banner>
      </div>
    )
  }

  const attendances = Array.isArray(participant.attendances) ? participant.attendances : []
  const eventAttendance = attendances.find((a) => a.session_id == null)
  const initials = participant.name?.slice(0, 1).toUpperCase() ?? 'P'
  const source = participant.photo_url
    ? (participant.photo_url.startsWith('/') || participant.photo_url.startsWith('http')
        ? participant.photo_url : `/${participant.photo_url}`)
    : null
  // Backend returns `uploads/qrcodes/1.png` (no leading slash); on a nested
  // route a relative src would resolve under /admin/participants/ and break.
  const qrSource = participant.qr_code_url
    ? (participant.qr_code_url.startsWith('/') || participant.qr_code_url.startsWith('http')
        ? participant.qr_code_url : `/${participant.qr_code_url}`)
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
        </Button>
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Participant record</h2>
        <span className="font-mono text-[10px] text-muted">#{participant.id}</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.6fr]">
        <Card variant="paper" padded className="p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-sand-200 text-lg font-semibold text-ink-700">
              {source ? <img src={source} alt="" className="h-full w-full object-cover" /> : initials}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[17px] font-semibold text-ink-900">{participant.name}</h3>
              <Badge tone={CATEGORY_TONE[participant.category] ?? 'grey'} className="mt-1 text-[9.5px]">
                {participant.category ?? 'Uncategorised'}
              </Badge>
            </div>
          </div>
          <dl className="mt-4 space-y-2.5 text-[12px]">
            {[
              [Mail, 'Email', participant.email],
              [Phone, 'Phone', participant.phone],
              [Building, 'Institution', participant.institution],
              [Tag, 'Registered', fmtDate(participant.registered_at)],
            ].map(([Icon, label, value]) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                <dt className="w-20 shrink-0 text-muted">{label}</dt>
                <dd className="min-w-0 break-words font-medium text-ink-900">{value || 'Not recorded'}</dd>
              </div>
            ))}
          </dl>
          {participant.qr_code_url && (
            <div className="mt-4 border-t border-border pt-3 text-center">
              <img src={qrSource} alt="Participant pass QR" className="mx-auto h-28 w-28 rounded-sm border border-border bg-paper" />
              <p className="mt-1 text-[9.5px] text-muted">Pass QR code</p>
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card variant="paper" padded className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-ink-900">Event arrival</h3>
              {eventAttendance ? (
                <Badge tone="teal" dot className="text-[9.5px]">Checked in</Badge>
              ) : (
                <Badge tone="grey" dot className="text-[9.5px]">Not arrived</Badge>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {eventAttendance
                ? `Recorded ${fmtDate(eventAttendance.marked_at)} by ${eventAttendance.method ?? 'desk'} verification.`
                : 'No event-level check-in has been recorded for this participant.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link to="/volunteer/arrival"><Ticket className="h-3.5 w-3.5" aria-hidden="true" /> Arrival desk</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/admin/attendance"><UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Attendance</Link>
              </Button>
            </div>
          </Card>

          <Card variant="paper" padded className="p-4">
            <h3 className="text-[13px] font-semibold text-ink-900">Attendance history</h3>
            {attendances.length === 0 ? (
              <p className="mt-3 rounded-sm border border-dashed border-border-strong bg-sand-100 p-4 text-center text-[11px] text-muted">
                No attendance records yet.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {attendances.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-ink-900">{a.session_name ?? 'Event check-in'}</p>
                      <p className="text-[10px] text-muted">{fmtDate(a.marked_at)}</p>
                    </div>
                    <Badge tone={METHOD_TONE[a.method] ?? 'grey'} className="text-[9.5px]">{a.method}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
