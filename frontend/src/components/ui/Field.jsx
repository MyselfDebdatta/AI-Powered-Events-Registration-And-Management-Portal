import { cloneElement, isValidElement, useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Field — one source of label + help + error layout for every form control.
 * It wires ids/aria onto a single control child, so forms never hand-build
 * label associations (§5.4, §9.6).
 */
export function Field({
  label,
  helper,
  error,
  required = false,
  id: idProp,
  children,
  className,
}) {
  const autoId = useId()
  // An explicit id on the control wins so the label and aria wiring follow it.
  const id = idProp ?? children?.props?.id ?? autoId
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = [helper ? helpId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ')

  let control = children
  if (isValidElement(children)) {
    control = cloneElement(children, {
      id: children.props.id ?? id,
      'aria-describedby':
        [children.props['aria-describedby'], describedBy].filter(Boolean).join(' ') ||
        undefined,
      'aria-invalid': error ? true : children.props['aria-invalid'],
    })
  }

  return (
    <div className={cn('w-full', className)}>
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
      {control}
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
}

export default Field
