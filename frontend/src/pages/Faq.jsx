import { ArrowRight } from 'lucide-react'
import { PageHero } from '../components/public/PageHero'
import FaqAccordion from '../components/public/FaqAccordion'
import { ActionLink } from '../components/ui/ActionLink'
import { faqs, faqStatus } from '../content/faq'

/**
 * FAQ — every published question (§7.1 FAQ): accordion plus a contact path
 * back to the event team. Answers only state what the platform confirms.
 */
export default function Faq() {
  return (
    <>
      <PageHero
        eyebrow="03 - FAQ"
        title={faqStatus.heading}
        lead={faqStatus.body}
        crumbs={[
          { to: '/', label: 'Home' },
          { label: 'FAQ' },
        ]}
      />

      <div className="container-prose py-8 pb-16 md:pb-24">
        <FaqAccordion items={faqs} idPrefix="page-faq" />

        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-paper p-5">
          <p className="min-w-0 flex-1 text-sm text-slate-700">
            Still unsure? The event team can help with registration, accessibility and
            attendance. Contact details to be announced.
          </p>
          <ActionLink to="/register" variant="secondary" size="sm">
            Register interest
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </ActionLink>
        </div>
      </div>
    </>
  )
}
