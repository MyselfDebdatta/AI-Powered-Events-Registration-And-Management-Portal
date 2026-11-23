import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { linkClasses } from './Button'

/**
 * ActionLink — a button that navigates. Internal routes render a router Link;
 * absolute URLs render an external anchor that opens in a new tab with
 * rel="noopener noreferrer" (§7.1 acceptance). Shares Button's variant map.
 */
export function ActionLink({
  to,
  href,
  variant = 'primary',
  size = 'md',
  children,
  className,
  onClick,
  ...props
}) {
  const classes = cn(linkClasses(variant, size), className)

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        onClick={onClick}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <Link to={to} className={classes} onClick={onClick} {...props}>
      {children}
    </Link>
  )
}

export default ActionLink
