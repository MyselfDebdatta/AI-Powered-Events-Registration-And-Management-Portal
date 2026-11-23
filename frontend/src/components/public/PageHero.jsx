import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Eyebrow } from './SectionLabel'
import Breadcrumbs from './Breadcrumbs'

/**
 * PageHero — shared head for public sub-pages (§6.8): breadcrumbs, mono
 * eyebrow, H1 and an optional lead. `wide` widens past the prose column for
 * grid pages (programme, speakers, venue).
 */
export function PageHero({ eyebrow, title, lead, crumbs, wide = false, children, className }) {
  return (
    <header className={cn('border-b border-border bg-ivory-100', className)}>
      <div className={cn(wide ? 'container-wide' : 'container-prose', 'pt-8 pb-8 md:pt-12')}>
        {crumbs && <Breadcrumbs items={crumbs} />}
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 text-h1 font-semibold text-ink-900">{title}</h1>
        {lead && (
          <p className={cn('mt-4 text-lead text-slate-700', !wide && 'max-w-[560px]')}>
            {lead}
          </p>
        )}
        {children}
      </div>
    </header>
  )
}

/** PlaceholderBadge — every unconfirmed block is visibly labelled (§7.1). */
export function PlaceholderBadge({ children = 'Placeholder — pending host approval' }) {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-gold-600 bg-gold-100 px-2.5 py-0.5 text-[11px] font-medium text-gold-700">
      {children}
    </span>
  )
}

/** BackLink — small secondary return link used under page leads. */
export function BackLink({ to, children }) {
  return (
    <Link
      to={to}
      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-900 underline-offset-4 hover:underline"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  )
}

export default PageHero
