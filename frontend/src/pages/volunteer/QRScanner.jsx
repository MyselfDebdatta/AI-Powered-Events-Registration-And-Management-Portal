import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Flashlight,
  Keyboard,
  QrCode,
  RefreshCw,
  ScanLine,
  StopCircle,
  WifiOff,
} from 'lucide-react'
import client from '../../api/client'
import flags from '../../content/flags'
import { useDesk } from '../../hooks/useDesk'
import { useSyncQueue } from '../../hooks/useSyncQueue'
import {
  isEndpointMissing,
  isOffline,
  looksLikeSignedToken,
  verifyPass,
} from '../../lib/arrivalApi'
import {
  addRecentScan,
  enqueue,
  newClientEventId,
  queueCount,
  readRecentScans,
} from '../../lib/outbox'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import ScanResult from '../../components/volunteer/ScanResult'

/**
 * QRScanner — `/volunteer/scan` (§7.6).
 *
 * The client never trusts the QR JSON: anything that is not a two-part signed
 * token is refused before a request, and the only verification path is
 * `POST /api/qr/verify`. Entry is one-time; session scans are once per
 * participant per session. Offline scans are queued and labelled unverified —
 * never "recorded".
 */

const PILL = {
  valid: { tone: 'teal', label: 'Recorded' },
  duplicate: { tone: 'amber', label: 'Duplicate' },
  invalid: { tone: 'red', label: 'Invalid' },
  expired: { tone: 'red', label: 'Expired' },
  'wrong-scope': { tone: 'red', label: 'Wrong scope' },
  offline: { tone: 'amber', label: 'Offline' },
  'backend-pending': { tone: 'amber', label: 'Unverified' },
  'camera-error': { tone: 'red', label: 'Camera' },
}

function timeOf(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function QRScanner() {
  const navigate = useNavigate()
  const { desk } = useDesk()
  const { pending, online } = useSyncQueue()
  const [mode, setMode] = useState('entry')
  const [sessionId, setSessionId] = useState('')
  const [sessionError, setSessionError] = useState(null)
  const [scanState, setScanState] = useState('idle')
  const [cameraError, setCameraError] = useState(null)
  const [result, setResult] = useState(null)
  const [recent, setRecent] = useState(readRecentScans)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const scannerRef = useRef(null)

  const { data: sessions } = useQuery({
    queryKey: ['volunteer', 'sessions'],
    queryFn: () => client.get('/sessions/').then((response) => response.data),
    enabled: mode === 'session',
    retry: false,
  })

  const stopScanning = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (!scanner) return
    try {
      await scanner.stop()
      scanner.clear()
    } catch {
      /* already stopped */
    }
  }, [])

  const finish = useCallback(
    (next, scanMode) => {
      const entry = { ...next, mode: scanMode, at: new Date().toISOString() }
      setResult(entry)
      setScanState('idle')
      setRecent(
        addRecentScan({
          name: next.participant?.name ?? null,
          state: next.state,
          label: PILL[next.state]?.label ?? 'Scan',
          mode: scanMode,
          tone: PILL[next.state]?.tone ?? 'grey',
        })
      )
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(next.state === 'valid' ? 60 : [40, 40, 40])
      }
    },
    []
  )

  const handleDecoded = useCallback(
    async (decodedText) => {
      const text = String(decodedText ?? '').trim()
      await stopScanning()
      setTorchOn(false)
      setTorchSupported(false)
      setResult({ state: 'processing', mode })

      // Screen out unsigned JSON before any network call (§7.6 rules).
      if (!looksLikeSignedToken(text)) {
        finish(
          {
            state: 'invalid',
            reason: 'This code is not a signed pass. Unsigned or hand-edited QR data is never accepted.',
          },
          mode
        )
        return
      }

      const scope = mode === 'session' ? 'SESSION' : 'ENTRY'
      const session = sessionId ? Number(sessionId) : null

      const queueScan = () => {
        enqueue({
          kind: 'SCAN',
          token: text,
          scope,
          sessionId: session,
          desk: desk.id,
          station: desk.station,
        })
        finish(
          {
            state: 'offline',
            reason: 'The scan is saved on this device. It is not verified until the hub reconnects.',
            pendingCount: queueCount(),
          },
          mode
        )
      }

      if (!online) {
        queueScan()
        return
      }

      if (!flags.scanV2) {
        finish(
          {
            state: 'backend-pending',
            reason: 'The signed-pass verification service is not live yet. Nothing was recorded.',
          },
          mode
        )
        return
      }

      try {
        const verification = await verifyPass({
          token: text,
          scope,
          sessionId: session,
          stationId: desk.station,
          deskId: desk.id,
          clientEventId: newClientEventId(),
        })
        finish(
          {
            state: verification.decision,
            participant: verification.participant,
            reason: verification.reason,
          },
          mode
        )
      } catch (error) {
        if (isOffline(error)) {
          queueScan()
        } else if (isEndpointMissing(error)) {
          finish(
            {
              state: 'backend-pending',
              reason: 'The signed-pass verification service is not live yet. Nothing was recorded.',
            },
            mode
          )
        } else {
          finish(
            {
              state: 'invalid',
              reason: error?.response?.data?.detail || 'The pass could not be verified.',
            },
            mode
          )
        }
      }
    },
    [desk.id, desk.station, finish, mode, online, sessionId, stopScanning]
  )

  const startScanning = useCallback(async () => {
    if (mode === 'session' && !sessionId) {
      setSessionError('Choose the session before starting the scanner.')
      return
    }
    setSessionError(null)
    setResult(null)
    setCameraError(null)
    setScanState('starting')
    try {
      // Load the camera library only when the volunteer starts scanning (§11.1).
      const { Html5Qrcode } = await import('html5-qrcode/esm/html5-qrcode.js')
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        handleDecoded,
        () => {}
      )
      setScanState('scanning')
      try {
        const capabilities = scanner.getRunningTrackCapabilities?.()
        setTorchSupported(Boolean(capabilities?.torch))
      } catch {
        setTorchSupported(false)
      }
    } catch {
      scannerRef.current = null
      setScanState('error')
      setCameraError(
        'The camera could not start. Grant camera permission, retry, or use manual lookup.'
      )
    }
  }, [handleDecoded, mode, sessionId])

  const toggleTorch = async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn((value) => !value)
    } catch {
      setTorchSupported(false)
      setTorchOn(false)
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    if (scanState === 'scanning' || scanState === 'starting') {
      stopScanning()
      setScanState('idle')
    }
    setResult(null)
    setTorchOn(false)
    setTorchSupported(false)
    // Changing checkpoint invalidates any scan in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const manualHref =
    mode === 'session' && sessionId
      ? `/volunteer/manual?mode=session&session=${sessionId}`
      : `/volunteer/manual?mode=${mode}`

  const scanNext = () => {
    setResult(null)
    startScanning()
  }

  return (
    <div className="mx-auto w-full max-w-[520px] space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/volunteer/dashboard"
          className="grid h-9 w-9 place-items-center rounded-sm text-ink-900 hover:bg-sand-100"
          aria-label="Back to desk home"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[21px] font-semibold tracking-[-0.03em] text-ink-900">Scan</h1>
          <p className="text-[11px] text-muted">
            {desk.label} · {desk.station} · {online ? 'Connected' : 'Offline'}
          </p>
        </div>
        {pending > 0 && (
          <Badge tone="amber" dot className="text-[10px]">
            {pending} pending
          </Badge>
        )}
      </div>

      <div
        role="group"
        aria-label="Checkpoint"
        className="grid grid-cols-2 gap-1 rounded-md border border-border bg-sand-100 p-1"
      >
        {[
          { id: 'entry', label: 'Entry' },
          { id: 'session', label: 'Session' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={mode === option.id}
            onClick={() => setMode(option.id)}
            className={
              mode === option.id
                ? 'min-h-10 rounded-sm bg-paper text-sm font-semibold text-ink-900 shadow-sm'
                : 'min-h-10 rounded-sm text-sm font-medium text-muted hover:text-ink-900'
            }
          >
            {option.label}
          </button>
        ))}
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
          helper="Session passes are valid once per participant for this session."
          options={(sessions ?? []).map((session) => ({
            value: String(session.id),
            label: session.name,
          }))}
        />
      )}

      {result && result.state !== 'processing' ? (
        <ScanResult
          state={result.state}
          mode={result.mode ?? mode}
          participant={result.participant}
          reason={result.reason}
          pendingCount={result.pendingCount ?? pending}
          onScanNext={scanNext}
          onManualLookup={() => navigate(manualHref)}
          onViewRecord={() =>
            navigate(
              result.participant?.id
                ? `/volunteer/manual?mode=entry&participant=${result.participant.id}`
                : manualHref
            )
          }
          onRetry={startScanning}
          onIssueNew={() => navigate('/volunteer/arrival')}
        />
      ) : result?.state === 'processing' ? (
        <div
          role="status"
          className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-md border border-border bg-paper"
        >
          <RefreshCw className="h-7 w-7 animate-spin text-teal-600" aria-hidden="true" />
          <p className="text-sm font-medium text-ink-900">Checking the pass…</p>
          <p className="text-[11px] text-muted">The hub verifies the signature, scope and duplicate rule.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-md border border-border bg-paper shadow-sm">
          <div className="relative min-h-[280px] bg-ink-900">
            <div
              id="qr-reader"
              className="min-h-[280px] w-full [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover"
            />

            {scanState !== 'scanning' && scanState !== 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-ivory-50">
                {scanState === 'error' ? (
                  <>
                    <CameraOff className="h-9 w-9 text-red-500" aria-hidden="true" />
                    <p className="max-w-[320px] text-[13px] leading-relaxed text-ivory-100/80">
                      {cameraError}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={startScanning}
                        className="border-ivory-100/30 bg-ivory-100/10 text-ivory-50 hover:bg-ivory-100/20 hover:text-ivory-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        Retry camera
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(manualHref)}
                        className="border-ivory-100/30 bg-ivory-100/10 text-ivory-50 hover:bg-ivory-100/20 hover:text-ivory-50"
                      >
                        <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                        Manual lookup
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="grid h-14 w-14 place-items-center rounded-full border border-ivory-100/20 bg-ivory-100/5">
                      <QrCode className="h-7 w-7 text-gold-500" aria-hidden="true" />
                    </span>
                    <p className="max-w-[320px] text-[13px] leading-relaxed text-ivory-100/80">
                      Point the camera at the participant&apos;s pass. Entry is once per
                      participant; session scans are once per session.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={startScanning}
                      className="border-ivory-100/30 bg-ivory-100/10 text-ivory-50 hover:bg-ivory-100/20 hover:text-ivory-50"
                    >
                      <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                      Start scanner
                    </Button>
                  </>
                )}
              </div>
            )}

            {scanState === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ivory-50">
                <RefreshCw className="h-7 w-7 animate-spin text-gold-500" aria-hidden="true" />
                <p className="text-[13px]">Starting camera…</p>
              </div>
            )}

            {scanState === 'scanning' && (
              <>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="relative h-[230px] w-[230px] rounded-md border border-teal-500/50">
                    <span className="absolute inset-x-4 top-1/2 h-px bg-teal-500/70" />
                    <span className="absolute left-2 top-2 h-5 w-5 border-l-2 border-t-2 border-gold-500" />
                    <span className="absolute right-2 top-2 h-5 w-5 border-r-2 border-t-2 border-gold-500" />
                    <span className="absolute bottom-2 left-2 h-5 w-5 border-b-2 border-l-2 border-gold-500" />
                    <span className="absolute bottom-2 right-2 h-5 w-5 border-b-2 border-r-2 border-gold-500" />
                  </div>
                </div>
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-xs border border-ivory-100/20 bg-ink-900/75 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
                  Scanning
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-[#FCF9F2] px-3 py-2.5">
            <div className="flex items-center gap-2">
              {scanState === 'scanning' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    stopScanning()
                    setScanState('idle')
                  }}
                >
                  <StopCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Stop scanner
                </Button>
              ) : (
                <Button size="sm" onClick={startScanning}>
                  <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
                  Start scanner
                </Button>
              )}
              {scanState === 'scanning' && torchSupported && (
                <Button variant="secondary" size="sm" onClick={toggleTorch} aria-pressed={torchOn}>
                  <Flashlight className="h-3.5 w-3.5" aria-hidden="true" />
                  {torchOn ? 'Torch off' : 'Torch'}
                </Button>
              )}
            </div>
            <Link
              to={manualHref}
              className="text-[11px] font-semibold text-ink-900 underline underline-offset-2"
            >
              Enter pass ID
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-md border border-border bg-paper p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-semibold text-ink-900">Recent scans</h2>
          <span className="text-[10px] text-muted">Last 5</span>
        </div>
        {recent.length === 0 ? (
          <p className="py-3 text-center text-[11.5px] text-muted">
            No scans on this device yet. Results appear here with their checkpoint.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((item) => {
              const meta = PILL[item.state] ?? {
                tone: item.tone ?? 'grey',
                label: item.label ?? 'Scan',
              }
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink-900">
                      {item.name || 'Pass scan'}
                    </p>
                    <p className="text-[10px] text-muted">
                      {timeOf(item.at)} · {item.mode === 'session' ? 'Session' : 'Entry'}
                    </p>
                  </div>
                  <Badge tone={meta.tone} className="shrink-0 text-[9.5px]">
                    {meta.label}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {!online && (
        <p className="flex items-start gap-2 rounded-sm border border-amber-600/25 bg-amber-100 px-3 py-2 text-[11px] text-amber-600">
          <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Offline — scans are saved locally and shown as unverified. {pending} pending sync.
          </span>
        </p>
      )}
    </div>
  )
}
