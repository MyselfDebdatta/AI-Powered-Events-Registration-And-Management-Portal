import { forwardRef, useId } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Select — native select (best on mobile) with the field's label, helper and
 * error wiring plus a chevron affordance (§5.2).
 */
const Select = forwardRef(function Select(
  {
    label,
    helper,
    error,
    placeholder,
    options,
    id: idProp,
    className,
    required,
    children,
    ...props
  },
  ref
) {
  const autoId = useId()
  const id = idProp ?? autoId
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy =
    [helper ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    props['aria-describedby'] ||
    undefined

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
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'block min-h-11 w-full appearance-none rounded-sm border bg-paper px-3 py-2.5 pr-10 text-base text-text',
            'transition-colors duration-fast border-border-control focus:border-ink-900',
            'disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-text-muted',
            error && 'border-status-danger'
          )}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-text-muted"
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

export default Select
