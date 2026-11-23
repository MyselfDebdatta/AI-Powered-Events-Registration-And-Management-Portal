import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

/**
 * Breadcrumbs — public page trail (§6.8). The last item is the current page
 * and carries aria-current="page".
 */
export function Breadcrumbs({ items, className }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-6', className)}>
      <ol className="flex flex-wrap items-center gap-2 text-xs text-muted">
        {items.map((item, index) => (
          <li key={item.to ?? item.label} className="flex items-center gap-2">
            {index > 0 && (
              <span aria-hidden="true" className="text-border-strong">
                /
              </span>
            )}
            {item.to ? (
              <Link
                to={item.to}
                className="underline-offset-2 transition-colors duration-fast hover:text-ink-900 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink-900">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
