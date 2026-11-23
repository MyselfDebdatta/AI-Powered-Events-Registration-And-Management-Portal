import { PageHero, PlaceholderBadge } from '../components/public/PageHero'
import Banner from '../components/ui/Banner'

/**
 * Accessibility — Stage 2 placeholder page. No venue access claim is made
 * before the venue confirms one; the page states the commitment and the
 * contact path instead (WCAG 2.2 AA §9, content rules §7.1).
 */
export default function Accessibility() {
  return (
    <>
      <PageHero
        eyebrow="Practical · Accessibility"
        title="Accessibility of this portal."
        lead="Access notes, arrival support and contact details will be published before the event."
        crumbs={[
          { to: '/', label: 'Home' },
          { label: 'Accessibility' },
        ]}
      />

      <div className="container-prose py-8 pb-16 md:pb-24">
        <Banner tone="warning" title="Details to be announced" className="mb-8">
          The venue's step-free routes, seating, quiet space and hearing support have not been
          confirmed yet. This page will be updated as soon as they are.
        </Banner>

        <div className="space-y-8">
          <section>
            <h2 className="text-h4 font-semibold text-ink-900">What we commit to</h2>
            <ul className="mt-3 space-y-2.5">
              {[
                'A staffed arrival desk with a documented check-in path that does not rely on a QR code.',
                'Assisted registration for anyone who cannot complete the form unaided.',
                'This website targets WCAG 2.2 AA: 44px touch targets, visible focus, keyboard access and reduced-motion support.',
                'An accessibility contact for questions and requests before the event.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                  <span aria-hidden="true" className="mt-2 h-1 w-3.5 shrink-0 rounded-full bg-gold-600" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-h4 font-semibold text-ink-900">Getting help on the day</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Tell any volunteer at the arrival desk what you need, or contact the event team
              before the event. Contact details to be announced.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <PlaceholderBadge>Working draft — pending venue confirmation</PlaceholderBadge>
        </div>
      </div>
    </>
  )
}
