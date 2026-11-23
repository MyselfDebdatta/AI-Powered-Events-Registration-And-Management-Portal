import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ListChecks,
  LifeBuoy,
  Printer,
  QrCode,
  ScanFace,
  Search,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDesk } from '../../hooks/useDesk'
import { useSyncQueue } from '../../hooks/useSyncQueue'
import event from '../../content/event'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

/**
 * VolunteerDashboard — the desk home (§7.5). It answers three questions in
 * one screen: which desk am I on, is the station healthy, and what do I do
 * next. Counts are live from the local outbox, never invented.
 */

const CHECKLIST = [
  'Camera permission allowed and preview tested',
  'Badge printer loaded with CR80 stock',
  'Desk number matches the station label',
  'Runbook open on a second screen or phone',
]

const CHECK_KEY = 'geekai.volunteer.checklist'

function useChecklist() {
  const [checked, setChecked] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CHECK_KEY) ?? '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CHECK_KEY, JSON.stringify(checked))
    } catch {
      /* ignore */
    }
  }, [checked])

  const toggle = (item) =>
    setChecked((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item]
    )

  return { checked, toggle }
}

const ACTIONS = [
  {
    to: '/volunteer/arrival',
    label: 'Arrival desk',
    body: 'Verify identity and issue the QR pass. Start here.',
    icon: ScanFace,
    primary: true,
  },
  {
    to: '/volunteer/scan',
    label: 'Scan entry or session',
    body: 'Verify a signed pass and record one unambiguous result.',
    icon: QrCode,
  },
  {
    to: '/volunteer/manual',
    label: 'Manual lookup',
    body: 'Lost pass, damaged print or camera failure.',
    icon: Search,
  },
  {
    to: '/volunteer/queue',
    label: 'Pending sync',
    body: 'Saved captures and scans waiting for the hub.',
    icon: ListChecks,
  },
  {
    to: '/volunteer/help',
    label: 'Desk runbook',
    body: 'Camera, printer, offline and duplicate answers.',
    icon: LifeBuoy,
  },
]

export default function VolunteerDashboard() {
  const { user } = useAuth()
  const { desk } = useDesk()
  const { pending, online } = useSyncQueue()
  const { checked, toggle } = useChecklist()

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gold-700">
            Event day · {event.shortName}
          </p>
          <h1 className="mt-0.5 text-[24px] font-semibold tracking-[-0.035em] text-ink-900">
            Good to see you, {user?.name || 'volunteer'}.
          </h1>
          <p className="mt-0.5 text-[12px] text-muted">
            You are on {desk.label} · {desk.station}. The desk works offline; nothing is lost
            while the network is down.
          </p>
        </div>
        <Badge tone={online ? 'teal' : 'amber'} dot>
          {online ? 'Connected to the hub' : `Offline — ${pending} pending`}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.to}
              to={action.to}
              className={
                action.primary
                  ? 'group rounded-md border border-gold-500/50 bg-paper p-4 shadow-sm transition-shadow hover:shadow-md'
                  : 'group rounded-md border border-border bg-paper p-4 shadow-sm transition-shadow hover:shadow-md'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={
                    action.primary
                      ? 'grid h-10 w-10 place-items-center rounded-md bg-gold-100 text-gold-700'
                      : 'grid h-10 w-10 place-items-center rounded-md bg-sand-100 text-ink-700'
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {action.to === '/volunteer/queue' && pending > 0 && (
                  <Badge tone="amber" dot>
                    {pending}
                  </Badge>
                )}
                <ArrowRight
                  className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <h2 className="mt-3 text-[15px] font-semibold text-ink-900">{action.label}</h2>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{action.body}</p>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-md border border-border bg-paper p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-ink-900">Station status</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              {desk.station}
            </span>
          </div>
          <dl className="mt-2 divide-y divide-border">
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="flex items-center gap-2 text-[12px] text-slate-700">
                {online ? (
                  <Wifi className="h-4 w-4 text-teal-600" aria-hidden="true" />
                ) : (
                  <WifiOff className="h-4 w-4 text-amber-600" aria-hidden="true" />
                )}
                Hub connection
              </dt>
              <dd className="text-[11.5px] font-semibold text-ink-900">
                {online ? 'Connected' : 'Offline — saved locally'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="flex items-center gap-2 text-[12px] text-slate-700">
                <ListChecks className="h-4 w-4 text-ink-700" aria-hidden="true" />
                Pending sync
              </dt>
              <dd className="text-[11.5px] font-semibold text-ink-900">
                {pending === 0 ? 'Nothing waiting' : `${pending} record${pending === 1 ? '' : 's'}`}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="flex items-center gap-2 text-[12px] text-slate-700">
                <Printer className="h-4 w-4 text-ink-700" aria-hidden="true" />
                Badge printer
              </dt>
              <dd className="text-[11.5px] font-semibold text-ink-900">
                Test with a real pass
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="flex items-center gap-2 text-[12px] text-slate-700">
                <ShieldCheck className="h-4 w-4 text-gold-600" aria-hidden="true" />
                Confirmation
              </dt>
              <dd className="text-[11.5px] font-semibold text-ink-900">Always required</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/volunteer/arrival">
              <Button size="sm">
                Open arrival desk
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
            <Link to="/volunteer/queue">
              <Button variant="secondary" size="sm">
                View queue
              </Button>
            </Link>
          </div>
        </section>

        <section className="rounded-md border border-border bg-paper p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-ink-900">Before the doors open</h2>
            <span className="text-[10px] text-muted">
              {checked.length}/{CHECKLIST.length}
            </span>
          </div>
          <ul className="mt-1 space-y-0.5">
            {CHECKLIST.map((item) => {
              const done = checked.includes(item)
              return (
                <li key={item}>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-sm px-1 text-[12px] text-slate-700 hover:bg-ivory-50">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggle(item)}
                      className="sr-only"
                    />
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-sand-300" aria-hidden="true" />
                    )}
                    <span className={done ? 'line-through decoration-sand-300' : undefined}>
                      {item}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
            The checklist stays on this device. It is a prompt, not a gate.
          </p>
        </section>
      </div>
    </div>
  )
}
