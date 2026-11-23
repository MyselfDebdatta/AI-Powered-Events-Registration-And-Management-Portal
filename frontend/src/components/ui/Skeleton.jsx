import { cn } from '../../lib/cn'

/**
 * Skeleton — layout-matched loading placeholder (never a spinner-only page).
 * Skeletons are aria-hidden; the containing region should set aria-busy
 * (§5.2, §9.8). Reduced motion turns the pulse off automatically.
 */
function Bar({ className }) {
  return <div className={cn('h-4 rounded-sm bg-sand-200', className)} aria-hidden="true" />
}

export function Skeleton({ variant = 'text', lines = 1, rows = 4, cols = 4, className }) {
  if (variant === 'card') {
    return (
      <div
        aria-hidden="true"
        className={cn('h-40 w-full animate-pulse rounded-md bg-sand-100', className)}
      />
    )
  }

  if (variant === 'table') {
    return (
      <div aria-hidden="true" className={cn('w-full space-y-3', className)}>
        <Bar className="h-8 w-full" />
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-3">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Bar
                key={colIndex}
                className={cn('h-4 flex-1', colIndex === 0 && 'max-w-[25%]')}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <div aria-hidden="true" className={cn('flex items-center gap-3', className)}>
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-sand-200" />
        <Bar className="flex-1" />
      </div>
    )
  }

  // variant === 'text'
  return (
    <div aria-hidden="true" className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Bar key={index} className={cn(index === lines - 1 && 'w-3/5')} />
      ))}
    </div>
  )
}

export default Skeleton
