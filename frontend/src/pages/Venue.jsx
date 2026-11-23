import { ArrowRight, Accessibility } from 'lucide-react'
import { PageHero } from '../components/public/PageHero'
import VenueMap from '../components/public/VenueMap'
import { ActionLink } from '../components/ui/ActionLink'
import { venue } from '../content/venue'

/**
 * Venue — map plus fact rows (§7.1 venue, mockup 02). Only confirmed facts
 * appear as facts; arrival, travel and accessibility stay marked as pending.
 */
export default function Venue() {
  return (
    <>
      <PageHero
        eyebrow="02 - Venue"
        title={venue.heading}
        lead={venue.note}
        crumbs={[
          { to: '/', label: 'Home' },
          { label: 'Venue' },
        ]}
        wide
      />

      <div className="container-wide py-8 md:py-12">
        <div className="grid gap-9 lg:grid-cols-[1.08fr_.92fr] lg:gap-12">
          <VenueMap />

          <div className="flex flex-col">
            <dl>
              {venue.rows.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[96px_1fr] gap-4 border-b border-border py-3.5"
                >
                  <dt className="pt-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
                    {row.key}
                  </dt>
                  <dd className="text-[13px] leading-relaxed text-slate-700">
                    {row.title && <b className="block font-semibold text-ink-900">{row.title}</b>}
                    <span className="block">{row.body}</span>
                    {row.note && <span className="mt-1 block text-xs text-muted">{row.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex gap-3 rounded-lg border border-sand-200 bg-sand-100 p-4">
              <Accessibility className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" aria-hidden="true" />
              <p className="text-[11.5px] leading-relaxed text-[#5A4D38]">{venue.accessNote}</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ActionLink to="/accessibility" variant="secondary" size="sm">
                Accessibility
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ActionLink>
              <ActionLink to="/faq" variant="link" size="sm">
                Contact the team
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ActionLink>
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-muted">
          The map above shows the venue. Use “Get directions” to open Google Maps for ITER, SOA
          University. Verified address, parking and transport details will be published here once
          the venue supplies them.
        </p>
      </div>
    </>
  )
}
