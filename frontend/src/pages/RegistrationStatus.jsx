import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import event from '../content/event'
import flags from '../content/flags'
import { useRegistrationStatus } from '../hooks/useRegistrationStatus'
import { STEPS, NEXT_ROWS, resolveStatus } from '../lib/statusMatrix'
import { PageHero, PlaceholderBadge } from '../components/public/PageHero'
import Breadcrumbs from '../components/public/Breadcrumbs'
import { Eyebrow } from '../components/public/SectionLabel'
import { KonarkMark } from '../components/public/KonarkMark'
import { ActionLink } from '../components/ui/ActionLink'
import { Badge } from '../components/ui/Badge'
import { Button, linkClasses } from '../components/ui/Button'
import Banner from '../components/ui/Banner'
import { cn } from '../lib/cn'

/**
 * RegistrationStatus — `/registration/status` (§7.3, mockup 04).
 *
 * Access: the signed link (`?token=...`) is the only lookup path until the
 * email + reference fallback exists (§14.1 #4), so a direct visit gets an
 * honest "no link, no lookup" screen instead of a search box that cannot
 * work. With a token, every state in the §7.3 matrix renders a designed
 * screen — heading, pill, real stepper, actions — never a toast.
 */

/* ------------------------------------------------------------------ helpers */

/** "just now" / "2 min ago" for the last-checked line (§7.3 copy). */
function relTime(date) {
  if (!date) return 'just now'
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  return `${mins} min ago`
}

function stamp(iso) {
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

/** Collapsed on phones, expanded on desktop (§7.3 mobile: accordion below). */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const onChange = (e) => setIsDesktop(e.matches)
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [])
  return isDesktop
}

/**
 * SupportAction — "Contact support" must never be a dead button. With a
 * confirmed contact address it is a mailto; without one it opens an inline
 * note that points at the address in the participant's own confirmation.
 */
function SupportAction({ primary = false, label = 'Contact support' }) {
  const [open, setOpen] = useState(false)

  if (event.contact.email) {
    return (
      <a href={`mailto:${event.contact.email}`} className={linkClasses(primary ? 'primary' : 'secondary')}>
        {label}
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="status-support-note"
        onClick={() => setOpen((o) => !o)}
        className={linkClasses(primary ? 'primary' : 'secondary')}
      >
        {label}
      </button>
      {open && (
        <div
          id="status-support-note"
          role="region"
          aria-label="Contact support"
          className="mt-3 rounded-lg border border-border bg-sand-100 p-4 text-sm leading-relaxed text-slate-700"
        >
          Contact details are not published yet. Use the email address on your confirmation —
          the host office replies there.{' '}
          <Link to="/faq" className="font-medium text-ink-900 underline underline-offset-2">
            Read the FAQ
          </Link>
          .
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ stepper */

const DOT = {
  done: 'bg-gold-600 border border-gold-600',
  current: 'bg-paper border-2 border-amber-600 shadow-[0_0_0_4px_rgba(180,83,9,0.11)]',
  upcoming: 'bg-paper border border-border-strong',
  error: 'bg-paper border-2 border-red-600 shadow-[0_0_0_4px_rgba(220,38,38,0.10)]',
  stopped: 'bg-sand-200 border border-sand-300',
}

const STATE_TEXT = {
  done: 'text-gold-700',
  current: 'text-amber-600',
  error: 'text-red-600',
  upcoming: 'text-muted',
  stopped: 'text-muted',
}

/** The real status machine as a 3-step progress list (§7.3 acceptance). */
function Stepper({ steps, stepStates }) {
  return (
    <ol aria-label="Registration progress" className="mt-7 grid grid-cols-3">
      {STEPS.map((step, i) => {
        const phase = steps[i]
        const last = i === STEPS.length - 1
        return (
          <li
            key={step.label}
            aria-current={phase === 'current' ? 'step' : undefined}
            className="relative pt-[22px]"
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-[7px] h-px bg-border-strong',
                i === 0 ? 'left-[7px]' : 'left-0',
                last ? 'right-[7px]' : 'right-0'
              )}
            />
            <span
              aria-hidden="true"
              className={cn('absolute left-0 top-0 z-[2] h-[15px] w-[15px] rounded-full', DOT[phase])}
            />
            <div className="text-[11px] font-semibold leading-tight text-ink-900">{step.label}</div>
            <div className={cn('mt-[3px] text-[10px] leading-tight', STATE_TEXT[phase])}>
              {stepStates[i]}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------- status card */

function DetailPanel({ data }) {
  const fields = [
    data.reference && { k: 'Reference', v: data.reference, mono: true },
    data.email && { k: 'Email', v: data.email },
    stamp(data.submittedAt) && { k: 'Submitted', v: stamp(data.submittedAt) },
  ].filter(Boolean)

  if (fields.length === 0) return null

  return (
    <dl className="mt-[26px] grid gap-[18px] rounded-[9px] border border-sand-200 bg-sand-100 px-[18px] py-3.5 sm:grid-cols-3">
      {fields.map((f) => (
        <div key={f.k}>
          <dt className="text-[9.5px] font-bold uppercase tracking-[0.11em] text-[#7A6B52]">{f.k}</dt>
          <dd className={cn('mt-1 text-xs font-semibold text-ink-900', f.mono && 'font-mono text-[11.5px]')}>
            {f.v}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function NextRows() {
  return (
    <div className="mt-[26px]">
      <h2 className="text-[13px] font-semibold tracking-[0.02em] text-ink-900">What happens next</h2>
      <ol className="mt-2.5">
        {NEXT_ROWS.map((row, i) => (
          <li key={row.title} className="flex gap-3.5 border-t border-border py-3">
            <span
              aria-hidden="true"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border-strong font-mono text-[9.5px] text-muted"
            >
              {i + 1}
            </span>
            <div>
              <div className="text-xs font-semibold text-ink-900">{row.title}</div>
              <div className="mt-0.5 text-[11px] leading-[1.5] text-muted">{row.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** One primary action per state, exactly as the §7.3 matrix specifies. */
function PrimaryAction({ kind, refresh }) {
  switch (kind) {
    case 'check':
      return (
        <Button onClick={refresh}>
          Check status
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      )
    case 'retry':
      return <Button onClick={refresh}>Try again</Button>
    case 'details':
      return <ActionLink to="/venue">View event details</ActionLink>
    case 'form':
      return <ActionLink to="/register">Open the form</ActionLink>
    case 'register':
      return <ActionLink to="/register">Register again</ActionLink>
    case 'lookup':
      // §7.3 matrix names this action; the fallback does not exist yet
      // (§14.1 #4), so it is disabled and explained — never a dead click.
      return (
        <Button disabled title="Email and reference lookup opens in a later release">
          Look up with email
        </Button>
      )
    case 'support':
      return <SupportAction primary />
    default:
      return null
  }
}

function SecondaryAction({ kind, refresh }) {
  if (kind === 'retry') return <Button variant="secondary" onClick={refresh}>Try again</Button>
  if (kind === 'support') {
    return (
      <SupportAction label={event.contact.email ? 'Email the team' : 'Contact support'} />
    )
  }
  return null
}

function StatusCard({ view, data, phase, fromCache, checkedAt, refresh, demo }) {
  const isReady = phase === 'ready'

  return (
    <section className="rounded-[14px] border border-border bg-paper p-6 shadow-[var(--shadow-md)] md:px-[38px] md:pb-[30px] md:pt-9">
      {demo && (
        <Banner tone="info" title="Demo registration — sample data" className="mb-5">
          This screen shows the layout with placeholder data for review. It is not a real
          participant record.
        </Banner>
      )}

      {fromCache && (
        <Banner tone="offline" title="Offline copy · may be out of date" className="mb-5">
          This is the last saved version of this status from {stamp(checkedAt) ?? 'earlier'}. The
          host office will confirm your place directly.
        </Banner>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <Eyebrow>Registration · AIS26</Eyebrow>
          <h1 className="mt-2 text-h1 font-semibold text-ink-900">{view.heading}</h1>
        </div>
        {view.pill && (
          <Badge tone={view.pill.tone} dot className="mt-1 h-7 shrink-0 px-3 text-xs">
            {view.pill.label}
          </Badge>
        )}
      </div>

      <p className="mt-2.5 max-w-[530px] text-sm leading-[1.6] text-slate-700">{view.sub}</p>

      {view.steps && <Stepper steps={view.steps} stepStates={view.stepStates} />}

      {isReady && <DetailPanel data={data} />}

      {view.showNext && <NextRows />}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <PrimaryAction kind={view.primary} refresh={refresh} />
        <SecondaryAction kind={view.secondary} refresh={refresh} />
        {isReady && (
          <span className="text-xs text-muted sm:ml-auto">Last checked {relTime(checkedAt)}</span>
        )}
      </div>

      <p className="mt-[18px] flex items-center gap-[7px] border-t border-border pt-3.5 text-[10px] text-muted">
        <Lock className="h-3 w-3 shrink-0 text-teal-600" aria-hidden="true" />
        Your details are used only for event registration and access.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------- aside */

const ARRIVAL = [
  { t: 'Photo ID', d: 'Helps the desk verify you quickly.' },
  { t: 'The email you registered with', d: 'Useful if we need to find your record.' },
  { t: 'A few minutes for verification', d: 'Face verification and pass issuance happen on site.' },
]

function Aside() {
  const isDesktop = useIsDesktop()

  return (
    <aside className="flex flex-col gap-4" aria-label="Arrival preparation and support">
      {/* "Before you arrive" — accordion on mobile, open on desktop (§7.3) */}
      <details open={isDesktop} className="group overflow-hidden rounded-xl bg-ink-900">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-[22px] pb-2.5 pt-[18px] [&::-webkit-details-marker]:hidden">
          <KonarkMark className="h-5 w-5 shrink-0 text-gold-500" strokeWidth={1.6} />
          <Eyebrow onDark className="min-w-0 flex-1">
            Before you arrive
          </Eyebrow>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-ivory-100/60 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="px-[22px] pb-[18px]">
          <h3 className="text-sm font-semibold tracking-[-0.01em] text-ivory-50">
            Three things to prepare.
          </h3>
          <p className="mt-1 text-[11px] leading-[1.5] text-ivory-100/55">
            The arrival desk is the only place your pass is issued.
          </p>
          <ul className="mt-3.5">
            {ARRIVAL.map((row) => (
              <li key={row.t} className="flex gap-[11px] border-t border-ivory-100/10 py-2.5">
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-gold-500/45 text-gold-500">
                  <Check className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[11.5px] font-semibold text-ivory-100">{row.t}</div>
                  <div className="mt-0.5 text-[10px] leading-[1.45] text-ivory-100/50">{row.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <section className="rounded-xl border border-border bg-paper p-[22px] shadow-[var(--shadow-sm)]">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink-900">
          Registration support
        </h3>
        <p className="mt-1 text-[11px] leading-[1.5] text-muted">
          Questions about your form, accessibility needs or the arrival process?
        </p>

        <div className="mt-3.5 flex gap-2.5 border-t border-border pt-3.5">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
          <div>
            {event.contact.email ? (
              <a
                href={`mailto:${event.contact.email}`}
                className="text-[11px] font-semibold text-ink-900 underline-offset-2 hover:underline"
              >
                Contact the host office
              </a>
            ) : (
              <div className="text-[11px] font-semibold text-ink-900">Contact the host office</div>
            )}
            <div className="mt-px text-[10px] text-muted">
              Use the email address on your confirmation.
            </div>
          </div>
        </div>

        <div className="my-3.5 h-px bg-border" />

        <Link to="/privacy" className="flex gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
          <div>
            <div className="text-[11px] font-semibold text-ink-900 underline-offset-2 group-hover:underline">
              Privacy and consent
            </div>
            <div className="mt-px text-[10px] text-muted">
              Read how photos and biometric data are handled.
            </div>
          </div>
        </Link>
      </section>

      <section className="rounded-xl border border-sand-200 bg-sand-100 p-[22px]">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-gold-600" aria-hidden="true" />
          <Eyebrow className="text-[#6B5508]">Dates</Eyebrow>
        </div>
        <p className="mt-1.5 text-xs font-semibold text-ink-900">{event.dateLabel}</p>
        <p className="mt-1 text-[11px] leading-[1.5] text-muted">
          Check the venue page for event details as they are published.
        </p>
      </section>
    </aside>
  )
}

/* -------------------------------------------------- interim (no-link) view */

function Interim() {
  return (
    <>
      <PageHero
        eyebrow="Registration status"
        title="Check your registration status."
        lead="Status checks open from the signed link in your confirmation email. Until email and reference lookup ships, the event team can confirm your registration directly."
        crumbs={[
          { to: '/', label: 'Home' },
          { label: 'Registration status' },
        ]}
      />

      <div className="container-prose py-8 pb-16 md:pb-24">
        <Banner tone="info" title="No link, no lookup — yet" className="mb-6">
          This page does not search by email yet, so landing here without your link looks up
          nothing. Open the link from your confirmation email, or contact the host office.
        </Banner>

        <ol className="border-t border-border">
          <li className="grid grid-cols-[36px_1fr] gap-4 border-b border-border py-4">
            <span className="font-mono text-sm font-semibold text-gold-700">1</span>
            <div>
              <h2 className="text-base font-semibold text-ink-900">Registered through the form?</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                The team reviews every response. You will hear from the host office once yours
                is confirmed.
              </p>
            </div>
          </li>
          <li className="grid grid-cols-[36px_1fr] gap-4 border-b border-border py-4">
            <span className="font-mono text-sm font-semibold text-gold-700">2</span>
            <div>
              <h2 className="text-base font-semibold text-ink-900">Your pass is issued on site</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                Passes are handed out at the arrival desk on the day. No QR code is sent by
                email before the event.
              </p>
            </div>
          </li>
          <li className="grid grid-cols-[36px_1fr] gap-4 border-b border-border py-4">
            <span className="font-mono text-sm font-semibold text-gold-700">3</span>
            <div>
              <h2 className="text-base font-semibold text-ink-900">Need an answer now?</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                Contact the host office with the email you registered with.{' '}
                <Link to="/faq" className="font-medium text-ink-900 underline underline-offset-4">
                  Contact details are on the FAQ page
                </Link>
                .
              </p>
            </div>
          </li>
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <ActionLink to="/register">
            Register interest
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ActionLink>
          <ActionLink to="/faq" variant="secondary">
            Read the FAQ
          </ActionLink>
        </div>

        <div className="mt-8">
          <PlaceholderBadge>
            Signed-link lookup only — email and reference search ships later
          </PlaceholderBadge>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------- page */

export default function RegistrationStatus() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  // Flag OFF (production default): no lookup runs and no signed link is read.
  const activeToken = flags.ticketPage ? token : null
  const { phase, data, view, fromCache, demo, checkedAt, refresh } = useRegistrationStatus(activeToken)

  // Signed status links must not be indexed (§7.3 access model).
  useEffect(() => {
    if (!token) return undefined
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => document.head.removeChild(meta)
  }, [token])

  if (!activeToken) return <Interim />

  let card
  if (phase === 'loading' || phase === 'idle') {
    card = (
      <div
        role="status"
        aria-label="Checking your registration"
        className="h-[420px] animate-pulse rounded-[14px] bg-sand-100"
      />
    )
  } else if (phase === 'error') {
    card = (
      <section className="rounded-[14px] border border-border bg-paper p-6 text-center shadow-[var(--shadow-md)] md:px-[38px] md:py-9">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-amber-100">
          <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-h2 font-semibold text-ink-900">
          We couldn't check your registration.
        </h1>
        <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-slate-700">
          Something went wrong while loading this status. Try again, or contact the host office
          with the email you registered with.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={refresh}>
            Try again
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </section>
    )
  } else if (phase === 'ready') {
    card = (
      <StatusCard
        view={view}
        data={data}
        phase={phase}
        fromCache={fromCache}
        checkedAt={checkedAt}
        refresh={refresh}
        demo={demo}
      />
    )
  } else {
    // notfound / expired → their matrix entries (steps hidden per §7.3)
    card = (
      <StatusCard
        view={resolveStatus(phase === 'notfound' ? 'NOT_FOUND' : 'EXPIRED')}
        data={null}
        phase={phase}
        fromCache={false}
        checkedAt={checkedAt}
        refresh={refresh}
        demo={false}
      />
    )
  }

  return (
    <div className="container-wide pb-16 pt-8 md:pb-24">
      <Breadcrumbs
        items={[
          { to: '/', label: 'Home' },
          { to: '/register', label: 'Registration' },
          { label: 'Status' },
        ]}
        className="mb-4"
      />

      <div className="grid items-start gap-[30px] lg:grid-cols-[minmax(0,1fr)_336px]">
        {card}
        <Aside />
      </div>
    </div>
  )
}
