import { useState } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import {
  LifeBuoy,
  ListChecks,
  LogOut,
  QrCode,
  ScanFace,
  Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useDesk } from '../../hooks/useDesk'
import { useSyncQueue } from '../../hooks/useSyncQueue'
import { drainOutbox } from '../../lib/arrivalApi'
import { KonarkMark } from '../public/KonarkMark'
import { cn } from '../../lib/cn'
import event from '../../content/event'
import SyncStatus from './SyncStatus'

/**
 * VolunteerLayout — the event-day shell (§7.5, mockup 06).
 *
 * Ink app bar with the event, the desk selector and the live offline pill;
 * one tab row for arrival, scanning, manual lookup, queue and the runbook.
 * Phones get a bottom nav so the camera screens stay full-width.
 */

const NAV = [
  { to: '/volunteer/arrival', label: 'Arrival', icon: ScanFace },
  { to: '/volunteer/scan', label: 'Scan', icon: QrCode },
  { to: '/volunteer/manual', label: 'Manual', icon: Search },
  { to: '/volunteer/queue', label: 'Queue', icon: ListChecks, queue: true },
  { to: '/volunteer/help', label: 'Help', icon: LifeBuoy },
]

function initials(name) {
  if (!name) return 'VN'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function VolunteerLayout() {
  const { user, logout } = useAuth()
  const { desk, desks, setDesk } = useDesk()
  const { pending, online } = useSyncQueue()
  const [retrying, setRetrying] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleRetry = async () => {
    setRetrying(true)
    try {
      const summary = await drainOutbox()
      if (summary.processed > 0) {
        toast.success(`${summary.processed} record${summary.processed === 1 ? '' : 's'} synced`)
      } else if (summary.waiting > 0) {
        toast('Waiting for backend — nothing can sync yet', { icon: '⚠️' })
      } else {
        toast(`Still offline — ${summary.pending} pending`, { icon: '⚠️' })
      }
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ivory-100">
      <a
        href="#volunteer-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-paper focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      <header className="on-dark bg-ink-900 text-ivory-50">
        <div className="mx-auto flex min-h-[60px] w-full max-w-[100rem] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/volunteer/dashboard"
              className="flex min-w-0 items-center gap-2.5"
              aria-label="Volunteer desk home"
            >
              <KonarkMark className="h-8 w-8 shrink-0 text-gold-500" strokeWidth={1.5} />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight tracking-[0.01em]">
                  Arrival desk
                </span>
                <span className="block truncate text-[9px] uppercase tracking-[0.12em] text-ivory-100/55">
                  {event.shortName} · {event.venue.institution}
                </span>
              </span>
            </Link>

            <span aria-hidden="true" className="hidden h-[24px] w-px bg-ivory-100/18 sm:block" />

            <label className="hidden items-center gap-1.5 sm:flex">
              <span className="sr-only">Desk</span>
              <select
                value={desk.id}
                onChange={(changeEvent) => setDesk(changeEvent.target.value)}
                className="min-h-9 rounded-sm border border-ivory-100/25 bg-ink-800 px-2 text-[11px] font-semibold text-ivory-50 focus-visible:outline-gold-500"
              >
                {desks.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ivory-100/50">
                {desk.station}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2.5">
            <SyncStatus
              pending={pending}
              online={online}
              onRetry={handleRetry}
              retrying={retrying}
            />
            <span className="hidden text-right text-[10px] leading-tight text-ivory-100/60 sm:block">
              <b className="block text-[11px] font-semibold text-ivory-50">{user?.name || 'Volunteer'}</b>
              Arrival desk
            </span>
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-full border border-ivory-100/25 bg-ivory-100/8 text-[10px] font-bold"
            >
              {initials(user?.name)}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="grid h-9 w-9 place-items-center rounded-sm text-ivory-100/60 transition-colors hover:bg-ivory-100/10 hover:text-ivory-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="border-t border-ivory-100/12 sm:hidden">
          <div className="mx-auto flex w-full max-w-[100rem] items-center justify-between px-4 py-1.5">
            <label className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-[0.1em] text-ivory-100/50">Desk</span>
              <select
                value={desk.id}
                onChange={(changeEvent) => setDesk(changeEvent.target.value)}
                className="min-h-8 rounded-sm border border-ivory-100/25 bg-ink-800 px-2 text-[11px] font-semibold text-ivory-50"
              >
                {desks.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ivory-100/50">
              {desk.station}
            </span>
          </div>
        </div>
      </header>

      <nav
        aria-label="Volunteer sections"
        className="hidden border-b border-border bg-paper sm:block"
      >
        <div className="mx-auto flex w-full max-w-[100rem] gap-1 overflow-x-auto px-4 lg:px-6">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-11 shrink-0 items-center gap-2 px-4 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'text-ink-900 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-gold-500'
                    : 'text-muted hover:text-ink-900'
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
              {item.queue && pending > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-600">
                  {pending}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <main id="volunteer-main" className="flex-1 pb-24 sm:pb-6">
        <div className="mx-auto w-full max-w-[100rem] px-4 py-4 lg:px-6 lg:py-5">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label="Volunteer sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-paper pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold',
                  isActive ? 'text-ink-900' : 'text-muted'
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
              {item.queue && pending > 0 && (
                <span className="absolute right-1/4 top-1.5 min-w-4 rounded-full bg-amber-600 px-1 text-[9px] font-bold text-white">
                  {pending}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default VolunteerLayout
