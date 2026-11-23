import { PageHero, PlaceholderBadge } from '../components/public/PageHero'
import Banner from '../components/ui/Banner'

/**
 * Privacy — Stage 2 placeholder notice. Only facts stated by the spec appear
 * as facts (photo used for event verification, never published); the full
 * notice is pending host-office approval and is labelled as such.
 */
export default function Privacy() {
  return (
    <>
      <PageHero
        eyebrow="Legal · Privacy"
        title="Privacy notice."
        lead="How the GeekAI registration portal handles your details and photo for the event you are registering for."
        crumbs={[
          { to: '/', label: 'Home' },
          { label: 'Privacy' },
        ]}
      />

      <div className="container-prose py-8 pb-16 md:pb-24">
        <Banner tone="warning" title="Placeholder notice" className="mb-8">
          This is a working draft pending host-office approval. The approved privacy notice
          will replace it before registration opens.
        </Banner>

        <div className="space-y-8">
          <section>
            <h2 className="text-h4 font-semibold text-ink-900">What you submit</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Registration collects your name, email, phone, institution, category, a recent
              photo, your consent, and any accessibility needs you choose to share.
            </p>
          </section>

          <section>
            <h2 className="text-h4 font-semibold text-ink-900">How your photo is used</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Your photo is used for event verification only. It is not published. Staff match
              it against your details at the arrival desk so the right pass goes to the right
              person.
            </p>
          </section>

          <section>
            <h2 className="text-h4 font-semibold text-ink-900">Where it is stored</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Registration data is held in the event platform's database. Retention periods and
              deletion requests are to be announced.
            </p>
          </section>

          <section>
            <h2 className="text-h4 font-semibold text-ink-900">Your choices</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              You can ask what is held about you, request a correction, or withdraw your
              registration by contacting the event team. Contact details to be announced.
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
