import { useId, useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Checkbox — 18px box on a 44px row; the label is part of the hit area,
 * so pointer and keyboard users share one target (§5.2, §8.5).
 * Works controlled (`checked` + `onChange`) or uncontrolled (`defaultChecked`).
 */
export function Checkbox({
  label,
  helper,
  error,
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  id: idProp,
  className,
  ...props
}) {
  const autoId = useId()
  const id = idProp ?? autoId
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const [internal, setInternal] = useState(defaultChecked)
  const isControlled = checked !== undefined
  const isChecked = isControlled ? checked : internal

  const handleChange = (event) => {
    if (!isControlled) setInternal(event.target.checked)
    onChange?.(event)
  }

  return (
    <div className={cn('w-full', className)}>
      <label
        htmlFor={id}
        className={cn(
          'flex min-h-11 cursor-pointer items-start gap-3 rounded-sm py-2',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <input
            id={id}
            type="checkbox"
            checked={isControlled ? isChecked : undefined}
            defaultChecked={isControlled ? undefined : defaultChecked}
            onChange={handleChange}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [helper ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') ||
              undefined
            }
            className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
            {...props}
          />
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none flex h-[18px] w-[18px] items-center justify-center rounded-xs border',
              'border-border-control bg-paper transition-colors duration-fast',
              'peer-checked:border-ink-900 peer-checked:bg-ink-900',
              'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink-900',
              error && 'border-status-danger'
            )}
          >
            <Check
              className={cn(
                'h-3 w-3 text-ivory-50 transition-opacity duration-fast',
                isChecked ? 'opacity-100' : 'opacity-0'
              )}
            />
          </span>
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-text">{label}</span>
          {helper && !error && (
            <span id={helpId} className="block text-xs text-text-muted">
              {helper}
            </span>
          )}
        </span>
      </label>
      {error && (
        <p id={errorId} className="flex items-start gap-1 pl-0 text-xs text-status-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

export default Checkbox
