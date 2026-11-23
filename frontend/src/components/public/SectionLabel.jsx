import { cn } from '../../lib/cn'

/**
 * SectionLabel — mono eyebrow with the gold rule used above every landing
 * section (§4.4 eyebrow, mockup 02). `onDark` swaps to the dark-surface gold.
 */
export function SectionLabel({ children, onDark = false, withRule = true, className }) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]',
        onDark ? 'text-gold-500' : 'text-gold-700',
        className
      )}
    >
      {withRule && (
        <span
          aria-hidden="true"
          className={cn('h-px w-7 shrink-0', onDark ? 'bg-gold-500' : 'bg-gold-500')}
        />
      )}
      {children}
    </p>
  )
}

/** Eyebrow — uppercase gold label for hero and page heads (no rule). */
export function Eyebrow({ children, onDark = false, className }) {
  return (
    <p
      className={cn(
        'text-[11px] font-bold uppercase leading-[1.45] tracking-[0.18em]',
        onDark ? 'text-gold-500' : 'text-gold-700',
        className
      )}
    >
      {children}
    </p>
  )
}

export default SectionLabel
