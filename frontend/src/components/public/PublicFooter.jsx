import { Link } from 'react-router-dom'
import KonarkMark from './KonarkMark'
import { event, platform } from '../../content/event'
import { flags } from '../../content/flags'

const columns = [
  {
    heading: 'Portal',
    links: [
      { to: '/venue', label: 'Venue' },
      { to: '/faq', label: 'FAQ' },
    ],
  },
  {
    heading: 'Registration',
    links: [
      { to: '/register', label: 'Register' },
      ...(flags.ticketPage
        ? [{ to: '/registration/status', label: 'Registration status' }]
        : []),
      { to: '/accessibility', label: 'Accessibility' },
      { to: '/code-of-conduct', label: 'Code of conduct' },
    ],
  },
]

/**
 * PublicFooter — ink band (§7.1 item 9, mockup 02): brand + working line,
 * co-brand lockups, Event / Practical / Host office columns, bottom bar with
 * privacy links and staff sign-in. Contact copy stays honest: no email is
 * invented before the host office confirms one.
 */
export function PublicFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink-900 text-ivory-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-23 -bottom-65 h-[420px] w-[420px] rounded-full border border-gold-500/12"
      />

      <div className="container-wide relative pt-10.5 pb-6.5">
        <div className="grid gap-10 md:grid-cols-4 md:gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              <KonarkMark className="h-8 w-8 text-gold-500" strokeWidth={1.7} />
              <span>
                <span className="block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ivory-100">
                  GeekAI
                </span>
                <span className="mt-1 block text-[9px] uppercase tracking-[0.16em] text-ivory-100/56">
                  Registration portal · {event.shortName}
                </span>
              </span>
            </div>

            <p className="mt-3.5 max-w-[280px] text-2xl font-semibold leading-tight tracking-[-0.02em] text-ivory-50">
              {platform.line}
            </p>
            <p className="mt-2.5 max-w-[300px] text-[11.5px] leading-relaxed text-ivory-100/50">
              {platform.purpose} {platform.reuse}
            </p>

            {/* Platform owner + currently served event */}
            <div className="mt-5.5 flex items-stretch gap-4.5">
              <div className="border-l border-ivory-100/16 pl-4.5">
                <b className="block text-[10px] font-bold uppercase tracking-[0.1em] text-ivory-100/82">
                  GeekAI Developer Team
                </b>
                <span className="mt-0.5 block text-[9px] text-ivory-100/56">Platform owner</span>
              </div>
              <div className="border-l border-ivory-100/16 pl-4.5">
                <b className="block text-[10px] font-bold uppercase tracking-[0.1em] text-ivory-100/82">
                  {event.name}
                </b>
                <span className="mt-0.5 block text-[9px] text-ivory-100/56">Currently serving</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((column) => (
            <nav key={column.heading} aria-label={`${column.heading} links`}>
              <h2 className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ivory-100/58">
                {column.heading}
              </h2>
              <ul>
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.to}-${link.label}`} className="mb-2">
                    <Link
                      to={link.to}
                      className="text-[11.5px] text-ivory-100/72 underline-offset-4 transition-colors duration-fast hover:text-ivory-50 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* About this portal */}
          <div>
            <h2 className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ivory-100/58">
              About this portal
            </h2>
            <ul className="text-[11.5px] text-ivory-100/72">
              <li className="mb-2">{platform.owner}</li>
              <li className="mb-2">{platform.status} {event.shortName}</li>
              <li className="mb-2">Contact to be announced</li>
            </ul>
            <Link
              to="/register"
              className="mt-3.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gold-500 underline-offset-4 transition-colors duration-fast hover:text-gold-100 hover:underline"
            >
              Register interest
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8.5 flex flex-col gap-3 border-t border-ivory-100/10 pt-3.5 text-[9.5px] tracking-[0.02em] text-ivory-100/56 md:flex-row md:items-center md:justify-between">
          <p>© {event.edition} GeekAI · Registration portal for {event.name}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              to="/privacy"
              className="underline-offset-4 transition-colors duration-fast hover:text-ivory-50 hover:underline"
            >
              Privacy
            </Link>
            <Link
              to="/code-of-conduct"
              className="underline-offset-4 transition-colors duration-fast hover:text-ivory-50 hover:underline"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="underline-offset-4 transition-colors duration-fast hover:text-ivory-50 hover:underline"
            >
              Photography consent
            </Link>
            <Link
              to="/login"
              className="underline-offset-4 transition-colors duration-fast hover:text-ivory-50 hover:underline"
            >
              Staff sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
