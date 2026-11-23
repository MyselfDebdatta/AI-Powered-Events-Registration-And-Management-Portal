import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Dialog — modal surface with role="dialog", aria-modal, focus trap, Esc to
 * close, body scroll lock and focus restoration to the trigger (§5.2, §9.4).
 */

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function Dialog({
  open = false,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children,
  className,
  initialFocusRef,
}) {
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)
  const titleId = useId()
  const descId = useId()

  // Open: lock scroll, move focus in, restore focus on close.
  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ??
        panelRef.current?.querySelector('[data-autofocus]') ??
        panelRef.current?.querySelector(FOCUSABLE) ??
        panelRef.current
      target?.focus()
    }, 0)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus?.()
    }
  }, [open, initialFocusRef])

  // Esc closes, from anywhere inside the dialog.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handlePanelKeyDown = (event) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      panelRef.current?.querySelectorAll(FOCUSABLE) ?? []
    ).filter((el) => el.offsetParent !== null || el === document.activeElement)
    if (focusable.length === 0) {
      event.preventDefault()
      panelRef.current?.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        // Backdrop click is a mouse convenience only: Escape and the labelled
        // close button are the accessible dismiss paths (§9.4).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        onClick={onClose}
        className="dialog-backdrop absolute inset-0 bg-ink-900/50"
      />
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- role=dialog panel owns the focus trap (§9.4) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        className={cn(
          'dialog-panel relative max-h-[90vh] w-full overflow-y-auto rounded-md bg-paper shadow-lg',
          'border border-border',
          sizes[size] ?? sizes.md,
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="text-h4 font-semibold text-text">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-text-muted transition-colors duration-fast hover:bg-sand-100 hover:text-text"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-border p-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default Dialog
