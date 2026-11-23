import { forwardRef, useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Input — labelled text field with helper and error wiring.
 * Standalone use: pass `label`. Inside <Field>, the Field supplies the label;
 * this component still owns ids, aria-describedby and aria-invalid (§5.4).
 */
const Input = forwardRef(function Input(
  {
    label,
    helper,
    error,
    icon: Icon,
    id: idProp,
    className,
    required,
    type = 'text',
    ...props
  },
  ref
) {
  const autoId = useId()
  const id = idProp ?? autoId
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const incomingDescribedBy = props['aria-describedby']
  const describedBy =
    [
      incomingDescribedBy,
      helper ? helpId : null,
      error ? errorId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined

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
      <div className="relative">
        {Icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted"
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'block min-h-11 w-full rounded-sm border bg-paper px-3 py-2.5 text-base text-text',
            'placeholder:text-text-muted transition-colors duration-fast',
            'border-border-control focus:border-ink-900',
            'disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-text-muted',
            'read-only:bg-sand-100',
            Icon && 'pl-10',
            error && 'border-status-danger',
            className
          )}
          {...props}
        />
      </div>
      {helper && !error && (
        <p id={helpId} className="mt-1 text-xs text-text-muted">
          {helper}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 flex items-start gap-1 text-xs text-status-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
