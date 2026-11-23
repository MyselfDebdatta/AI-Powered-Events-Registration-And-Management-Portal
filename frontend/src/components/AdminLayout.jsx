import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LogOut,
  UserCheck,
  Users,
  CalendarDays,
  ClipboardCheck,
  Download,
  Upload,
  Activity,
  ShieldAlert,
  Sliders,
  Menu,
  X,
  Bell,
} from 'lucide-react'
import { KonarkMark } from './public/KonarkMark'
import { cn } from '../lib/cn'

const NAV = [
  { to: '/admin/dashboard', label: 'Overview', icon: Users },
  { to: '/admin/imports', label: 'Imports', icon: Upload },
  { to: '/admin/live-ops', label: 'Live ops', icon: Activity },
  { to: '/admin/participants', label: 'Participants', icon: Users },
  { to: '/admin/sessions', label: 'Sessions', icon: CalendarDays },
  { to: '/admin/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/admin/volunteers', label: 'Volunteers', icon: UserCheck },
  { to: '/admin/reconciliation', label: 'Reconciliation', icon: ClipboardCheck },
  { to: '/admin/export', label: 'Export', icon: Download },
]

const SYSTEM = [
  { to: '/admin/settings', label: 'Settings', icon: Sliders },
  { to: '/admin/audit', label: 'Audit log', icon: ShieldAlert },
]

/** Four primary destinations on the mobile bottom bar; the rest live in More. */
const MOBILE_NAV = NAV.slice(0, 4)

function shortName(name) {
  if (!name) return 'OP'
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function NavItem({ item, isActive }) {
  const Icon = item.icon
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/admin/dashboard'}
      className={({ isActive: active }) =>
        cn(
          'relative flex min-h-9 items-center gap-2 px-2.5 rounded-sm text-[10.5px] font-medium transition-colors',
          active || isActive
            ? 'bg-ivory-100/10 text-ivory-50'
            : 'text-ivory-100/55 hover:bg-ink-800/50 hover:text-ivory-50'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {item.label}
    </NavLink>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenu, setMobileMenu] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initials = shortName(user?.name)

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-ivory-100">
      {/* ================= mobile top bar (first in DOM for small screens) ================= */}
      <header
        className="lg:hidden h-[56px] shrink-0 flex items-center justify-between gap-0 border-b border-border bg-ivory-950 px-3 py-2 sticky top-0 z-30"
      >
        <button
          type="button"
          onClick={() => setMobileMenu((open) => !open)}
          aria-expanded={mobileMenu}
          aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'}
          className="shrink-0 h-8 w-8 rounded-sm border border-border bg-paper text-ink-900 hover:bg-sand-100"
        >
          {mobileMenu ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <div className="flex items-center gap-2 px-2 flex-1 min-w-0">
          <KonarkMark className="h-4 w-4 text-gold-600" strokeWidth={1.4} />
          <div className="min-w-0">
            <div className="text-[10px] font-bold leading-none tracking-[0.02em] text-ink-900">
              OAIS 2026
            </div>
            <div className="text-[7px] uppercase tracking-[0.16em] text-muted">
              Admin console
            </div>
          </div>
        </div>
        <div
          className={cn(
            'grid h-7 w-7 place-items-center rounded-full border border-gold-500/20 bg-gold-500/10 text-[7.5px] font-bold text-gold-700',
            mobileMenu ? 'opacity-0 pointer-events-none' : undefined
          )}
          aria-hidden="true"
        >
          {initials}
        </div>
      </header>

      {/* ================= desktop shell ================= */}
      <aside
        className="hidden lg:flex lg:flex-col w-[232px] min-h-screen shrink-0 border-r border-border bg-ink-900 text-ivory-100"
        aria-label="Admin navigation"
      >
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2.5 px-2">
            <KonarkMark className="h-5 w-5 text-gold-500" strokeWidth={1.4} />
            <div>
              <div className="text-[11px] font-bold leading-none tracking-[0.02em] text-ivory-50">
                OAIS 2026
              </div>
              <div className="text-[7px] uppercase tracking-[0.16em] text-ivory-50/60">
                Admin console
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-ink-800/40 py-2">
          <div className="px-2 mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-ivory-50/60">
            Operations
          </div>
          <nav className="space-y-1">{NAV.map((item) => <NavItem key={item.to} item={item} />)}</nav>
        </div>

        <div className="mt-2 border-t border-ink-800/40 py-2">
          <div className="px-2 mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-ivory-50/60">
            System
          </div>
          <nav className="space-y-1">{SYSTEM.map((item) => <NavItem key={item.to} item={item} />)}</nav>
        </div>

        <div className="mt-auto border-t border-ink-800/40 pt-3 px-2 pb-1">
          <div className="mt-3 flex items-center gap-2 px-2">
            <div
              className={cn(
                'grid h-7 w-7 place-items-center rounded-full border border-gold-500/30 bg-gold-500/10',
                'text-[8.5px] font-bold text-gold-500'
              )}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[9.5px] font-semibold leading-none text-ivory-50">
                {user?.name || 'Admin'}
              </div>
              <div className="text-[7.5px] uppercase tracking-[0.14em] text-ivory-50/55">
                Admin · desk access
              </div>
            </div>
            <div className="ml-auto">
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="grid h-6 w-6 place-items-center rounded-sm text-ivory-100/50 hover:bg-ivory-100/10 hover:text-ivory-50 transition-colors"
              >
                <LogOut className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= main area ================= */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop top bar */}
        <header
          className="hidden lg:flex h-[56px] shrink-0 items-center justify-between border-b border-border bg-ivory-950/80 backdrop-blur-sm px-3 py-2"
        >
          <div className="flex items-center gap-2.5 px-2">
            <KonarkMark className="h-4 w-4 text-gold-500" strokeWidth={1.4} />
            <div className="min-w-0">
              <div className="text-[10px] font-bold leading-none tracking-[0.02em] text-ink-900">
                OAIS 2026
              </div>
              <div className="text-[7px] uppercase tracking-[0.16em] text-muted">
                Admin console
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8 border-l border-border pl-4">
            <div className="relative shrink-0">
              <svg
                className="absolute left-2.5 top-2.5 h-3 w-3 text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" strokeLinecap="round" />
                <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                placeholder="Search participants, IDs or sessions…"
                className="w-full min-w-[290px] rounded-sm border border-border bg-paper px-10 py-1.5 pr-3 text-[10px] text-muted placeholder:text-muted focus-visible:outline-gold-500"
              />
            </div>
            <span className="text-[9px] text-muted">Sample data</span>
            <span className="flex items-center gap-1 text-[9px] font-medium text-muted">
              <span className="h-1 w-1 rounded-full bg-teal-500" aria-hidden="true" />
              Cloud data · 2 min old
            </span>
            <button
              type="button"
              aria-label="Notifications"
              className="h-7 w-7 shrink-0 rounded-sm border border-border bg-paper text-ink-700 hover:bg-sand-100"
            >
              <Bell className="h-3 w-3" aria-hidden="true" />
            </button>
            <div
              className={cn(
                'grid h-7 w-7 place-items-center rounded-full border border-gold-500/20 bg-gold-500/10',
                'text-[7.5px] font-bold text-gold-700'
              )}
              aria-hidden="true"
            >
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 pb-24 lg:px-6 lg:py-5 lg:pb-5">
          <Outlet />
        </main>
      </div>

      {/* ================= mobile bottom nav: four items + More ================= */}
      <nav
        aria-label="Admin sections"
        className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-paper pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin/dashboard'}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold',
                    isActive ? 'text-ink-900' : 'text-muted'
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </NavLink>
            )
          })}
          <button
            type="button"
            onClick={() => setMobileMenu(true)}
            aria-label="More admin sections"
            aria-expanded={mobileMenu}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        </div>
      </nav>

      {mobileMenu && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex flex-col bg-ivory-100"
          role="navigation"
          aria-label="Admin navigation"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-ivory-950">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
              Navigation
            </span>
            <button
              type="button"
              onClick={() => setMobileMenu(false)}
              aria-label="Close navigation"
              className="h-7 w-7 rounded-sm border border-border bg-paper text-ink-900 hover:bg-sand-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-muted px-2 mb-1">
              Operations
            </div>
            <div className="space-y-1">{NAV.map((item) => <NavItem key={item.to} item={item} />)}</div>
            <div className="my-2 border-t border-border" />
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-muted px-2 mb-1">
              System
            </div>
            <div className="space-y-1">{SYSTEM.map((item) => <NavItem key={item.to} item={item} />)}</div>
            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-center gap-2 px-2">
                <div
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded-full border border-gold-500/30 bg-gold-500/10',
                    'text-[8.5px] font-bold text-gold-500'
                  )}
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-[9.5px] font-semibold leading-none text-ink-900">
                    {user?.name || 'Admin'}
                  </div>
                  <div className="text-[7.5px] uppercase tracking-[0.14em] text-muted">
                    Admin · desk access
                  </div>
                </div>
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Sign out"
                    className="grid h-6 w-6 place-items-center rounded-sm text-muted hover:bg-sand-100 transition-colors"
                  >
                    <LogOut className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
