import { useState } from 'react'
import { cn } from '../../lib/cn'

/**
 * Tabs — underline tablist with roving tabindex and arrow-key navigation
 * (§5.2, §9.4). Pair with <TabPanel tabId="…">; keep tab ids unique per page
 * so tab/panel ids stay in sync.
 */

function nextTab(tabs, currentIndex, direction) {
  const count = tabs.length
  for (let step = 1; step <= count; step += 1) {
    const index = (currentIndex + direction * step + count) % count
    if (!tabs[index].disabled) return index
  }
  return currentIndex
}

export function Tabs({
  tabs,
  value,
  onChange,
  defaultValue,
  ariaLabel = 'Sections',
  className,
}) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.id)
  const activeId = isControlled ? value : internal
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeId)
  )

  const select = (index) => {
    const tab = tabs[index]
    if (!tab || tab.disabled) return
    if (!isControlled) setInternal(tab.id)
    onChange?.(tab.id)
  }

  const handleKeyDown = (event) => {
    let targetIndex = null
    if (event.key === 'ArrowRight') targetIndex = nextTab(tabs, activeIndex, 1)
    else if (event.key === 'ArrowLeft') targetIndex = nextTab(tabs, activeIndex, -1)
    else if (event.key === 'Home') targetIndex = tabs.findIndex((t) => !t.disabled)
    else if (event.key === 'End') {
      targetIndex = tabs.length - 1 - [...tabs].reverse().findIndex((t) => !t.disabled)
    }
    if (targetIndex === null || targetIndex < 0) return
    event.preventDefault()
    select(targetIndex)
    const buttons = event.currentTarget.querySelectorAll('[role="tab"]')
    buttons[targetIndex]?.focus()
  }

  return (
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- APG tabs: focus lives on the selected tab, not the tablist
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      // Per the ARIA APG tabs pattern the tablist itself is not a tab stop;
      // focus lives on the selected tab (roving tabindex).
      // eslint-disable-next-line jsx-a11y/interactive-supports-focus
      className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => select(index)}
            className={cn(
              'relative min-h-11 shrink-0 px-4 text-sm font-medium transition-colors duration-fast',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? 'text-ink-900 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-gold-500 after:content-[""]'
                : 'text-text-muted hover:text-ink-900'
            )}
          >
            {tab.icon && <tab.icon className="mr-2 inline h-4 w-4" aria-hidden="true" />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/** Panel paired with a Tabs tab (same page, unique tabId). */
export function TabPanel({ tabId, active, children, className }) {
  return (
    <div
      role="tabpanel"
      id={`panel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      hidden={!active}
      tabIndex={0}
      className={cn(
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900',
        className
      )}
    >
      {active && children}
    </div>
  )
}

export default Tabs
