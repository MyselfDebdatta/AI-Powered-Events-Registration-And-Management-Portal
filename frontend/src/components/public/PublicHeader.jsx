import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowRight, Menu } from 'lucide-react'
import KonarkMark from './KonarkMark'
import MobileMenu from './MobileMenu'
import { event, platform } from '../../content/event'
import { cn } from '../../lib/cn'

const navLinks = [
  { to: '/venue', label: 'Venue' },
  { to: '/faq', label: 'FAQ' },
]

/**
 * PublicHeader — top strip + masthead (§6.2). Desktop: nav centre-right with
 * the ink CTA; mobile: lockup + 44px menu trigger. The masthead only sticks
 * after 120px of scroll, at 64px tall with a 1px rule and no blur.
 */
export function PublicHeader() {
  const [stuck, setStuck] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 120)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the sheet whenever navigation changes the route.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <>
      {/* Top strip — host / event logo links (reference layout) */}
      <div className="bg-ink-900">
        <div className="container-wide flex min-h-11 items-center justify-between gap-4 py-1.5 text-[10px] tracking-[0.06em] text-ivory-100/72">
          <span className="hidden sm:block">
            A registration service by the <b className="font-semibold text-ivory-100">{platform.owner}</b>
          </span>
          <span className="sm:hidden">Registration portal · {event.shortName}</span>

          <div className="flex items-center gap-3 sm:gap-5">
            {/* OAIS 2026 — event wordmark; no official logo file is published, so
                the Konark mark + name are used, never a claimed official asset. */}
            {event.hostLinks.official ? (
              <a
                href={event.hostLinks.official}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 rounded-sm px-1 py-1 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                aria-label={`Odisha AI Conference 2026 official website (opens in a new tab)`}
              >
                <img src="/oaic-logo.webp" alt="" className="h-8 w-auto shrink-0" />
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-ivory-50">
                    OAIC 2026
                  </span>
                  <span className="block text-[8px] text-ivory-100/55">Official site</span>
                </span>
              </a>
            ) : (
              <span className="flex items-center gap-2 px-1 py-1" title="Official link to be announced">
                <img src="/oaic-logo.webp" alt="" className="h-8 w-auto shrink-0" />
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-ivory-50">
                    OAIC 2026
                  </span>
                  <span className="block text-[8px] text-ivory-100/55">Link to be announced</span>
                </span>
              </span>
            )}

            <span aria-hidden="true" className="hidden h-6 w-px bg-ivory-100/20 md:block" />

            {/* SOA University — supplied official mark */}
            <a
              href={event.hostLinks.soa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-sm px-1 py-1 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              aria-label="SOA University official website (opens in a new tab)"
            >
              <img src="/soa-logo.webp" alt="" className="h-7 w-auto shrink-0" />
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-ivory-50">
                  SOA University
                </span>
                <span className="block text-[8px] text-ivory-100/55">Official site</span>
              </span>
            </a>
          </div>
        </div>
      </div>

      <header
        className={cn(
          'z-40 border-b border-border bg-ivory-100',
          stuck
            ? 'sticky top-0 h-16 bg-ivory-100/95'
            : 'h-[54px] lg:h-[74px]'
        )}
      >
        <div className="container-wide flex h-full items-center justify-between gap-4">
          {/* Lockup */}
          <Link to="/" className="flex items-center gap-2.5 lg:gap-3" aria-label="GeekAI Registration Portal — home">
            <KonarkMark className="h-[30px] w-[30px] shrink-0 text-gold-600 lg:h-[38px] lg:w-[38px]" />
            <span className="min-w-0">
              <span className="block truncate text-[9.5px] font-bold uppercase leading-[1.2] tracking-[0.09em] text-ink-900 lg:text-[13px] lg:tracking-[0.08em]">
                GeekAI
              </span>
              <span className="mt-0.5 block truncate text-[8px] uppercase leading-[1.2] tracking-[0.13em] text-muted lg:text-[9.5px] lg:tracking-[0.16em]">
                Registration portal · {event.shortName}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'relative py-2 text-[13px] font-medium text-slate-700 transition-colors duration-fast hover:text-ink-900',
                    isActive &&
                      'text-ink-900 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-gold-500 after:content-[""]'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/register"
              className="ml-2 inline-flex h-[38px] items-center gap-2 rounded-sm bg-ink-900 px-4 text-[13px] font-medium text-ivory-50 transition-colors duration-fast hover:bg-ink-800"
            >
              Register interest
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </nav>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label="Open menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-border text-ink-900 transition-colors duration-fast hover:bg-sand-100 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}

export default PublicHeader
