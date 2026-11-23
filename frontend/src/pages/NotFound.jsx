import { Link } from 'react-router-dom'

/**
 * NotFound — real 404 with recovery links and no automatic redirect (§7.9).
 */

const links = [
  { to: '/', label: 'Home' },
  { to: '/register', label: 'Register' },
  { to: '/login', label: 'Staff sign-in' },
]

function KonarkWheel({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="16" cy="16" r="10.5" />
        <circle cx="16" cy="16" r="7.4" />
        <circle cx="16" cy="16" r="2.4" />
        <line x1="18.4" y1="16" x2="26.5" y2="16" />
        <line x1="17.7" y1="17.7" x2="23.4" y2="23.4" />
        <line x1="16" y1="18.4" x2="16" y2="26.5" />
        <line x1="14.3" y1="17.7" x2="8.6" y2="23.4" />
        <line x1="13.6" y1="16" x2="5.5" y2="16" />
        <line x1="14.3" y1="14.3" x2="8.6" y2="8.6" />
        <line x1="16" y1="13.6" x2="16" y2="5.5" />
        <line x1="17.7" y1="14.3" x2="23.4" y2="8.6" />
      </g>
    </svg>
  )
}

export function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-16">
      <div className="on-dark w-full max-w-lg rounded-md border border-ink-800 bg-ink-900 p-8 text-center shadow-lg">
        <KonarkWheel className="mx-auto h-12 w-12 text-gold-500" />
        <p className="mt-4 font-bold text-gold-500 text-display">404</p>
        <h1 className="mt-2 text-h3 text-ivory-50">This page doesn't exist</h1>
        <p className="mx-auto mt-3 max-w-prose text-sm text-ivory-50/70">
          The link may be out of date, or the page may have moved. Pick one of
          these instead.
        </p>
        <nav aria-label="Recovery links" className="mt-6 flex flex-wrap justify-center gap-3">
          {links.map((link, index) => (
            <Link
              key={link.to}
              to={link.to}
              className={
                index === 0
                  ? 'inline-flex min-h-11 items-center rounded-sm bg-gold-500 px-5 text-sm font-medium text-ink-900 transition-colors duration-fast hover:bg-gold-600'
                  : 'inline-flex min-h-11 items-center rounded-sm border border-gold-500 px-5 text-sm font-medium text-gold-500 transition-colors duration-fast hover:bg-gold-500 hover:text-ink-900'
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}

export default NotFound
