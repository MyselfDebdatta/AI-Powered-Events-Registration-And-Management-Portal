import { PageHero, PlaceholderBadge } from '../components/public/PageHero'
import Banner from '../components/ui/Banner'

/**
 * CodeOfConduct — Stage 2 placeholder. Behaviour standards are written only
 * at the level the host has approved; enforcement contact stays an honest
 * placeholder rather than an invented address.
 */
export default function CodeOfConduct() {
  return (
    <>
      <PageHero
        eyebrow="Practical · Code of conduct"
        title="Code of conduct."
        lead="How we expect everyone at the event — participants, staff and volunteers — to treat each other."
        crumbs={[
          { to: '/', label: 'Home' },
          { label: 'Code of conduct' },
        ]}
      />

      <div className="container-prose py-8 pb-16 md:pb-24">
        <Banner tone="warning" title="Placeholder" className="mb-8">
          This draft is pending host-office approval. The approved code of conduct will
          replace it before registration opens.
        </Banner>

        <div className="space-y-8">
          <section>
            <h2 className="text-h4 font-semibold text-ink-900">The short version</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Be respectful. Harassment, intimidation, discrimination and disruptive behaviour
              are not accepted at any event activity — on site, online or at social events.
            </p>
          </section>

          <section>
            <h2 className="text-h4 font-semibold text-ink-900">If something happens</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Report it to any member of staff or to the event team. Reports are taken
              seriously and handled confidentially as far as possible. The reporting contact
              will be published here before the event.
            </p>
          </section>

          <section>
            <h2 className="text-h4 font-semibold text-ink-900">Consequences</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Organisers may ask someone to leave, or refuse entry, when this code is not
              followed. Final enforcement wording is to be announced.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <PlaceholderBadge>Working draft — pending host approval</PlaceholderBadge>
        </div>
      </div>
    </>
  )
}
