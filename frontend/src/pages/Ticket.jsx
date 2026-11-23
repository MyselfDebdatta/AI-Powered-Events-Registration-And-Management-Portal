import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Eye, Lock, MapPin, Calendar, Clock, Printer } from 'lucide-react'
import flags from '../content/flags'
import { useTicket } from '../hooks/useTicket'
import { TicketCard } from '../components/ticket/TicketCard'
import { Badge } from '../components/ui/Badge'
import { ActionLink } from '../components/ui/ActionLink'
import Banner from '../components/ui/Banner'

/**
 * Ticket — `/ticket/:token` (§7.4, mockup 05): the participant pass.
 * The signed token in the URL is the credential; the page is noindex, never
 * shows a QR for a non-issued state, and falls back to the cached offline
 * copy when the network is gone.
 */

const KICKER = {
  issued: { tone: 'teal', label: 'Issued' },
  used: { tone: 'grey', label: 'Used' },
  expired: { tone: 'amber', label: 'Expired' },
  revoked: { tone: 'red', label: 'Revoked' },
  'not-issued': { tone: 'neutral', label: 'Not issued yet' },
}

function formatTime(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
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

function ticketStateOf(ticketStatus) {
  switch (ticketStatus) {
    case 'ISSUED':
      return 'issued'
    case 'USED':
      return 'used'
    case 'EXPIRED':
      return 'expired'
    case 'REVOKED':
      return 'revoked'
    case 'NOT_ISSUED':
      return 'not-issued'
    default:
      return 'unknown'
  }
}

/** App bar: back, title, help (§7.4 layout). */
function AppBar() {
  const navigate = useNavigate()
  return (
    <header className="no-print border-b border-border bg-ivory-100">
      <div className="mx-auto flex h-[50px] w-full max-w-[390px] items-center justify-between px-4.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="-ml-2 grid h-8 w-8 place-items-center rounded-full text-ink-900 transition-colors hover:bg-sand-100"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="text-[13px] font-semibold tracking-[-0.005em] text-ink-900">
            Your pass
          </span>
        </div>
        <Link
          to="/faq"
          className="text-[10.5px] font-semibold text-gold-700 underline-offset-4 hover:underline"
        >
          Help
        </Link>
      </div>
    </header>
  )
}

/** Centered 390px column — the whole participant screen (§7.4 mobile). */
function Column({ children }) {
  return (
    <div className="mx-auto w-full max-w-[390px] px-4.5 pt-3 pb-8">{children}</div>
  )
}

function DetailRow({ icon, k, children, last = false }) {
  const Icon = icon
  return (
    <div
      className={`flex items-center gap-2.5 py-2 ${last ? '' : 'border-b border-border'}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-gold-600" aria-hidden="true" />
      <span className="w-[62px] shrink-0 text-[9px] font-bold uppercase tracking-[0.07em] text-muted">
        {k}
      </span>
      <span className="text-[10.5px] leading-snug text-slate-700">{children}</span>
    </div>
  )
}

/** Recovery panel for an unusable link — never a 404 (§7.4 states). */
function RecoveryPanel({ title, children }) {
  return (
    <section className="rounded-xl border border-border bg-paper p-6 text-center shadow-[var(--shadow-md)]">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-amber-100">
        <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-ink-900">{title}</h1>
      <div className="mt-2 text-sm leading-relaxed text-slate-700">{children}</div>
      <div className="mt-5 flex flex-col gap-2.5">
        <ActionLink to="/registration/status" className="justify-center">
          Find my registration
        </ActionLink>
        <ActionLink to="/faq" variant="secondary" className="justify-center">
          Read the FAQ
        </ActionLink>
      </div>
    </section>
  )
}

function UnavailablePanel() {
  return (
    <section className="rounded-xl border border-border bg-paper p-6 shadow-[var(--shadow-md)]">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink-900">
        Pass pages aren't open yet.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        The live pass screen opens when participant passes start being issued at the arrival
        desk. Nothing is looked up when you open this address.
      </p>
      <div className="mt-5 flex flex-col gap-2.5">
        <ActionLink to="/registration/status" className="justify-center">
          Check registration status
        </ActionLink>
        <ActionLink to="/faq" variant="secondary" className="justify-center">
          Read the FAQ
        </ActionLink>
      </div>
    </section>
  )
}

export default function Ticket() {
  const { token } = useParams()
  // Flag OFF (production default): no lookup runs and the panel explains why.
  const { phase, data, fromCache, demo, checkedAt, refresh, error } = useTicket(
    flags.ticketPage ? token : null
  )
  const ticketRef = useRef(null)

  // Signed-ticket routes must not be indexed or leak the token via referrer (§12.8).
  useEffect(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    const referrer = document.createElement('meta')
    referrer.name = 'referrer'
    referrer.content = 'no-referrer'
    document.head.appendChild(robots)
    document.head.appendChild(referrer)
    return () => {
      robots.remove()
      referrer.remove()
    }
  }, [])

  const showPass = () => {
    ticketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  /** Print the pass as A6 with a 40mm QR, black on white (§12.7). */
  const printTicket = () => {
    document.body.classList.add('ticket-printing')
    const cleanup = () => {
      document.body.classList.remove('ticket-printing')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    try {
      window.print?.()
    } finally {
      window.setTimeout(cleanup, 1200)
    }
  }

  let body
  let kicker = null
  let showBottomBar = false

  if (!flags.ticketPage) {
    body = <UnavailablePanel />
  } else if (phase === 'loading' || phase === 'idle') {
    body = (
      <div
        aria-busy="true"
        className="h-[420px] animate-pulse rounded-[18px] bg-sand-100"
        aria-label="Loading your pass"
      />
    )
  } else if (phase === 'notfound') {
    body = (
      <RecoveryPanel title="We couldn't open this pass.">
        The link may be broken, mistyped or already replaced. This does not mean anything is
        wrong with your registration — ask the host office or the desk to resend your link.
      </RecoveryPanel>
    )
  } else if (phase === 'expired') {
    body = (
      <RecoveryPanel title="This link has expired.">
        Signed links stop working after a while for your privacy. The desk can look you up and
        issue a fresh pass on the day.
      </RecoveryPanel>
    )
  } else if (phase === 'error') {
    body = (
      <section className="rounded-xl border border-border bg-paper p-6 text-center shadow-[var(--shadow-md)]">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink-900">
          We couldn't load your pass.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {error?.isNetwork
            ? 'You appear to be offline and there is no saved copy of this pass on this device yet.'
            : 'Something went wrong while loading this pass.'}{' '}
          Try again, or ask at the desk if it keeps failing.
        </p>
        <button
          type="button"
          onClick={refresh}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-ink-900 px-5 text-sm font-semibold text-ivory-50 transition-colors hover:bg-ink-700"
        >
          Try again
        </button>
      </section>
    )
  } else if (phase === 'ready') {
    const state = ticketStateOf(data.ticketStatus)

    if (state === 'unknown') {
      body = (
        <section className="rounded-xl border border-border bg-paper p-6 text-center shadow-[var(--shadow-md)]">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink-900">
            We can't display this pass yet.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Your link worked, but the pass returned a state this screen does not know. The desk
            can confirm your entry directly.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-ink-900 px-5 text-sm font-semibold text-ivory-50 transition-colors hover:bg-ink-700"
          >
            Try again
          </button>
        </section>
      )
    } else if (state === 'not-issued') {
      body = (
        <section className="rounded-xl border border-border bg-paper p-6 shadow-[var(--shadow-md)]">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink-900">
            Your pass is issued at the arrival desk.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            No QR code is sent by email before the event. Bring a photo ID and the email you
            registered with — a volunteer issues your one-time pass in person.
          </p>
          <div className="mt-4">
            <ActionLink to="/registration/status" className="justify-center">
              Find my registration
            </ActionLink>
          </div>
        </section>
      )
    } else {
      kicker = KICKER[state]
      showBottomBar = state === 'issued' || state === 'used'

      body = (
        <>
          {demo && (
            <Banner tone="info" title="Demo pass — sample data" className="mb-3">
              This pass shows the layout with placeholder data for review. It is not a real
              ticket and its QR encodes the demo link only.
            </Banner>
          )}

          {fromCache && (
            <Banner tone="offline" title="Offline copy · may be out of date" className="mb-3">
              This is the last saved version of your pass from{' '}
              {formatStamp(checkedAt) ?? 'earlier'}. The desk will verify your pass live.
            </Banner>
          )}

          <div ref={ticketRef} className="ticket-print-sheet">
            <TicketCard
              state={state}
              name={data.name}
              passId={data.passId}
              token={data.token}
              scope={data.scope}
              usedAtLabel={data.usedAt ? formatTime(data.usedAt) : null}
            />
          </div>

          <div className="details mt-3.5">
            <DetailRow icon={MapPin} k="Entry">
              <b className="font-semibold text-ink-900">Arrival desk</b> · location to be
              announced
            </DetailRow>
            <DetailRow icon={Calendar} k="Sessions">
              {data.sessions ?? 'Access per seat availability'}
            </DetailRow>
            <DetailRow icon={Clock} k="Issued" last>
              {data.issuedAt
                ? formatStamp(data.issuedAt)
                : 'At arrival · event date to be announced'}
            </DetailRow>
          </div>

          {state === 'issued' && (
            <>
              <div className="mt-2.5 flex gap-2.5 rounded-[9px] border border-amber-600/20 bg-amber-100 px-3 py-2.5">
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-[9.5px] font-bold text-[#7C3A06]">Keep this page open.</p>
                  <p className="mt-0.5 text-[9px] leading-snug text-[#8A5A2B]">
                    Screenshots may be out of date. Open the live pass at the desk.
                  </p>
                </div>
              </div>
              <p className="mt-2.5 flex items-center gap-1.5 text-[9.5px] text-muted">
                <Eye className="h-3 w-3 text-gold-600" aria-hidden="true" />
                Turn screen brightness up before scanning.
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[9.5px] text-muted">
                <Lock className="h-3 w-3 text-gold-600" aria-hidden="true" />
                This pass is personal. Do not share it.
              </p>
              <button
                type="button"
                onClick={printTicket}
                className="no-print mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border-control bg-paper px-4 text-[12px] font-semibold text-ink-900 hover:bg-sand-100"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print pass (A6)
              </button>
            </>
          )}

          {state === 'used' && (
            <p className="mt-3 rounded-[9px] border border-border bg-sand-100 px-3 py-2.5 text-[10.5px] text-slate-700">
              Entry has been recorded for this pass. Need help? Go to the desk.
            </p>
          )}

          {(state === 'expired' || state === 'revoked') && (
            <p className="mt-3 rounded-[9px] border border-border bg-sand-100 px-3 py-2.5 text-[10.5px] text-slate-700">
              {state === 'expired'
                ? 'Get a new pass at the arrival desk.'
                : 'This pass was revoked. Contact the desk or the host office.'}
            </p>
          )}

          <p className="sr-only" data-testid="last-checked">
            {fromCache
              ? `Offline copy saved ${formatStamp(checkedAt) ?? ''}`
              : `Last checked ${formatStamp(checkedAt) ?? 'just now'}`}
          </p>
        </>
      )
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ivory-100">
      <AppBar />

      <main id="main" className="flex-1">
        <Column>
          {kicker && (
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold-700">
                Participant · 2026
              </span>
              <Badge tone={kicker.tone} dot className="h-[22px] px-2 text-[9px]">
                {kicker.label}
              </Badge>
            </div>
          )}

          {body}
        </Column>
      </main>

      {showBottomBar && (
        <footer className="sticky-cta no-print border-t border-border bg-ivory-100/97">
          <div className="mx-auto flex h-[62px] w-full max-w-[390px] items-center justify-between gap-3 px-4.5 pb-[env(safe-area-inset-bottom)]">
            <div>
              <p className="text-[9.5px] font-semibold text-ink-900">Have your photo ID ready</p>
              <p className="mt-0.5 text-[8.5px] text-muted">
                Show this pass at the entry desk.
              </p>
            </div>
            <button
              type="button"
              onClick={showPass}
              className="inline-flex h-9 items-center justify-center rounded-md bg-ink-900 px-3 text-[10.5px] font-semibold text-ivory-50 transition-colors hover:bg-ink-700"
            >
              Show pass
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
