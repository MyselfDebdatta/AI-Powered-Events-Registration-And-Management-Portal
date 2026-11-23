import { cn } from '../../lib/cn'

/**
 * Badge — status pill. Colour never carries meaning alone: every pill has a
 * text label, and critical states can add an icon (§4.3, §5.5).
 * `className` merges last, so legacy per-category colours still win.
 */
const tones = {
  neutral: 'bg-sand-100 text-ink-900',
  ink: 'bg-ink-900 text-ivory-50',
  gold: 'bg-gold-100 text-gold-700',
  teal: 'bg-teal-100 text-teal-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
  grey: 'bg-sand-200 text-slate-700',
  outline: 'border border-border-strong bg-transparent text-ink-900',
}

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  icon: Icon,
  className,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        'whitespace-nowrap',
        tones[tone] ?? tones.neutral,
        className
      )}
      {...props}
    >
      {dot && (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  )
}

export default Badge
