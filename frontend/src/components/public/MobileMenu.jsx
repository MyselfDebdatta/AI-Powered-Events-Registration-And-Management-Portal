import { Link, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Drawer from '../ui/Drawer'
import { cn } from '../../lib/cn'

const links = [
  { to: '/venue', label: 'Venue' },
  { to: '/faq', label: 'FAQ' },
]

/**
 * MobileMenu — full-height sheet for <1024px navigation (§6.2): large links,
 * CTA at the bottom, focus trap and Esc supplied by Drawer.
 */
export function MobileMenu({ open, onClose }) {
  const location = useLocation()

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Menu"
      id="mobile-menu"
      className="max-w-full"
    >
      <nav aria-label="Main">
        <ul className="divide-y divide-border">
          {links.map((link) => {
            const active = location.pathname === link.to
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center justify-between text-h3 font-semibold transition-colors duration-fast',
                    active ? 'text-gold-700' : 'text-ink-900 hover:text-ink-700'
                  )}
                >
                  {link.label}
                  <ArrowRight className="h-5 w-5 text-muted" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-6 border-t border-border pt-6">
        <Link
          to="/register"
          onClick={onClose}
          className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-sm bg-ink-900 px-6 text-base font-medium text-ivory-50 transition-colors duration-fast hover:bg-ink-800"
        >
          Register interest
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="mt-3 text-center text-xs text-muted">On this site</p>
      </div>
    </Drawer>
  )
}

export default MobileMenu
