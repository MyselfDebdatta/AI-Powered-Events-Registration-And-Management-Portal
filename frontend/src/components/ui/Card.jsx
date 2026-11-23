import { cn } from '../../lib/cn'

/**
 * Card — the one raised surface: paper for panels, sand for quiet ones,
 * dark for emphasis. Never nest a card inside a card (§4.5, §5.2).
 * Legacy stat props (`title`, `value`, `subtitle`, `icon`) are preserved.
 */
const variants = {
  paper: 'bg-paper border border-border',
  sand: 'bg-sand-100 border border-sand-200',
  dark: 'bg-ink-900 border border-ink-800 text-ivory-50 on-dark',
}

export function Card({
  title,
  icon: Icon,
  value,
  subtitle,
  children,
  variant = 'paper',
  padded = true,
  className,
  ...props
}) {
  const hasHeader = title || Icon || value !== undefined
  return (
    <div
      className={cn(
        'rounded-md shadow-sm transition-shadow',
        variants[variant] ?? variants.paper,
        padded && 'p-6',
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3
                className={cn(
                  'text-sm font-medium',
                  variant === 'dark' ? 'text-ivory-50/70' : 'text-text-muted'
                )}
              >
                {title}
              </h3>
            )}
            {value !== undefined && (
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {value}
              </p>
            )}
            {subtitle && (
              <p
                className={cn(
                  'mt-1 text-sm',
                  variant === 'dark' ? 'text-ivory-50/70' : 'text-text-muted'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {Icon && (
            <span
              aria-hidden="true"
              className={cn(
                'shrink-0 rounded-sm p-2',
                variant === 'dark' ? 'bg-ink-800 text-gold-500' : 'bg-sand-100 text-ink-700'
              )}
            >
              <Icon className="h-6 w-6" />
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

export default Card
