import { forwardRef, useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Textarea — multi-line field (3–6 rows) with a counter shown only when a
 * real maxLength limit exists (§5.2).
 */
const Textarea = forwardRef(function Textarea(
  { label, helper, error, id: idProp, className, required, rows = 4, maxLength, value, ...props },
  ref
) {
  const autoId = useId()
  const id = idProp ?? autoId
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy =
    [helper ? helpId : null, error ? errorId : null, maxLength ? `${id}-count` : null]
      .filter(Boolean)
      .join(' ') || undefined
  const length = typeof value === 'string' ? value.length : 0

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-text">
          {label}
          {required && (
            <>
              <span className="ml-1 text-status-danger" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'block w-full rounded-sm border bg-paper px-3 py-2.5 text-base text-text',
          'placeholder:text-text-muted transition-colors duration-fast',
          'border-border-control focus:border-ink-900',
          'disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-text-muted',
          error && 'border-status-danger'
        )}
        {...props}
      />
      <div className="mt-1 flex items-start justify-between gap-3">
        {error ? (
          <p id={errorId} className="flex items-start gap-1 text-xs text-status-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : helper ? (
          <p id={helpId} className="text-xs text-text-muted">
            {helper}
          </p>
        ) : (
          <span />
        )}
        {maxLength && (
          <span id={`${id}-count`} className="shrink-0 text-xs text-text-muted tabular-nums">
            {length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
})

export default Textarea
