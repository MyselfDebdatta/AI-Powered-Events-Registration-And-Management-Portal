import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Button — one primary action per view. Ink is the default; gold is reserved
 * for the arrival desk's "Issue QR pass" and ceremonial moments (§5.3).
 * `loading` keeps the button's width and sets aria-busy.
 */
const variants = {
  primary: 'bg-ink-900 text-ivory-50 hover:bg-ink-800 active:bg-ink-700',
  gold: 'bg-gold-500 text-ink-900 hover:bg-gold-600 active:bg-gold-600',
  secondary:
    'border border-border-control bg-transparent text-ink-900 hover:bg-sand-100 active:bg-sand-200',
  ghost: 'text-ink-900 hover:bg-sand-100 active:bg-sand-200',
  danger: 'bg-red-600 text-white hover:bg-red-600/90 active:bg-red-600/80',
  link: 'text-ink-900 hover:text-ink-700 active:text-ink-700',
  // Gold text link for dark (ink) surfaces — §7.1 speakers CTA.
  linkGold: 'text-gold-500 hover:text-gold-100 active:text-gold-100',
  // Legacy aliases (pre-redesign pages) — remove in post-event cleanup.
  accent: 'bg-gold-500 text-ink-900 hover:bg-gold-600 active:bg-gold-600',
  outline:
    'border border-border-control bg-transparent text-ink-900 hover:bg-sand-100 active:bg-sand-200',
}

const sizes = {
  // sm is 34px visually but keeps a 44px hit area (§8.5).
  sm: 'h-[34px] px-3 text-sm gap-1.5 relative after:absolute after:-inset-y-[5px] after:inset-x-0 after:content-[""]',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-[50px] px-6 text-base gap-2',
}

const baseClasses =
  'relative inline-flex cursor-pointer items-center justify-center rounded-sm font-medium ' +
  'transition-colors duration-fast'

/** Shared look for `<button>` and link buttons — one variant map (§5.10). */
export function linkClasses(variant = 'primary', size = 'md') {
  return cn(baseClasses, variants[variant] ?? variants.primary, sizes[size] ?? sizes.md)
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        linkClasses(variant, size),
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {loading && (
        <Loader2 className="absolute h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      <span className={cn('inline-flex items-center gap-1.5', loading && 'invisible')}>
        {children}
      </span>
    </button>
  )
}

export default Button
