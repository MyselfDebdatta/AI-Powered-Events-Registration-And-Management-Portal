import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * FaqAccordion — single-open accordion (§7.1 FAQ): button rows with
 * aria-expanded/aria-controls, Enter/Space natively supported, chevron
 * rotates 180°. Answers stay in the DOM and collapse with grid-rows so the
 * motion is layout-driven (§5.7; reduced-motion shortens it to 0ms).
 */
export function FaqAccordion({ items, idPrefix = 'faq' }) {
  const [openId, setOpenId] = useState(null)

  return (
    <div className="border-t border-border">
      {items.map((item) => {
        const open = openId === item.id
        const buttonId = `${idPrefix}-button-${item.id}`
        const panelId = `${idPrefix}-panel-${item.id}`
        return (
          <div key={item.id} className="border-b border-border">
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
                className={cn(
                  'flex min-h-[68px] w-full items-center justify-between gap-4 py-4 text-left',
                  'text-base font-semibold text-ink-900 transition-colors duration-fast hover:text-ink-700 md:text-h4'
                )}
              >
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'h-5 w-5 shrink-0 text-muted transition-transform duration-fast motion-reduce:transition-none',
                    open && 'rotate-180'
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                'grid transition-[grid-template-rows] duration-base ease-standard motion-reduce:duration-none',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-prose pb-5 pr-8 text-sm leading-relaxed text-slate-700 md:text-base">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FaqAccordion
