import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Drawer — edge panel for mobile nav and filter sheets. Focus trap, Esc,
 * body scroll lock and focus restoration, same contract as Dialog (§5.2).
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function Drawer({
  open = false,
  onClose,
  side = 'right',
  title,
  children,
  footer,
  id,
  className,
}) {
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => {
      const target =
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
  }, [open])

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
    <div className="fixed inset-0 z-50">
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
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Panel'}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        className={cn(
          'absolute inset-y-0 flex w-full max-w-sm flex-col bg-paper shadow-lg',
          side === 'right' ? 'right-0 drawer-right' : 'left-0 drawer-left',
          className
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          {title && (
            <h2 id={titleId} className="text-h4 font-semibold text-text">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className={cn(
              'ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-sm',
              'text-text-muted transition-colors duration-fast hover:bg-sand-100 hover:text-text'
            )}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
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

export default Drawer
