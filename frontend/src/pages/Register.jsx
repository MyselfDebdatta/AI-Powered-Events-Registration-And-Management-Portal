import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHero } from '../components/public/PageHero'
import Banner from '../components/ui/Banner'
import RegistrationForm from '../components/registration/RegistrationForm'
import { event, platform } from '../content/event'

/** Numbered three-step explainer (§7.2). */
const steps = [
  {
    n: '1',
    title: 'Submit the form',
    body: 'Your details, a recent photo and your consent, on this site.',
  },
  {
    n: '2',
    title: 'The team reviews your registration',
    body: 'We check the photo and details you submitted so the desk can match them on arrival.',
  },
  {
    n: '3',
    title: 'Your pass is issued at the arrival desk',
    body: 'In person, on the day. No QR code is sent by email before the event.',
  },
]

const beforeYouStart = [
  'Use the same email you can access on event day.',
  'Have a recent photo ready — one clear face, plain background.',
  'Read the privacy notice before giving consent.',
]

/**
 * Register — the in-site React form (§7.2). This page is a real form, not a
 * handoff. The page owns framing, offline detection and the closed state;
 * RegistrationForm owns validation, photo, submit, success and duplicate.
 */
export default function Register() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  const closed = event.registration.closed

  return (
    <>
      <PageHero
        eyebrow="GeekAI · Registration portal"
        title="Register for the event."
        lead={`It takes about five minutes. This portal is run by the ${platform.owner} and currently serves ${event.name}. Your pass is issued at the arrival desk after identity verification.`}
        crumbs={[
          { to: '/', label: 'Home' },
          { label: 'Register' },
        ]}
      />

      <div className="container-prose pt-8 pb-16 md:pb-24">
        {closed ? (
          <section aria-labelledby="closed-heading">
            <Banner tone="warning" title="Registration closed" className="mb-6">
              Registration is closed for this event. Your pass is issued at the arrival desk,
              not by email.
            </Banner>
            <h2 id="closed-heading" className="text-h3 font-semibold text-ink-900">
              Registration is closed
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-700">
              If you have already registered, check your status. For help, contact the host
              office — contact details are to be announced.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to={event.links.status}
                className="inline-flex h-11 items-center rounded-sm bg-ink-900 px-4 text-sm font-medium text-ivory-50"
              >
                Check your registration status
              </Link>
              <Link to="/faq" className="text-sm font-medium text-ink-900 underline underline-offset-4">
                Contact the host office
              </Link>
            </div>
          </section>
        ) : (
          <>
            <RegistrationForm online={online} />

            <section aria-labelledby="steps-heading" className="mt-14 border-t border-border pt-8">
              <h2 id="steps-heading" className="text-h3 font-semibold text-ink-900">
                What happens after you submit
              </h2>
              <ol className="mt-5 border-t border-border">
                {steps.map((step) => (
                  <li
                    key={step.n}
                    className="grid grid-cols-[36px_1fr] gap-4 border-b border-border py-4"
                  >
                    <span className="font-mono text-sm font-semibold text-gold-700">{step.n}</span>
                    <div>
                      <h3 className="text-base font-semibold text-ink-900">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section
              aria-labelledby="before-heading"
              className="mt-10 rounded-lg border border-sand-200 bg-sand-100 p-5"
            >
              <h2 id="before-heading" className="text-h4 font-semibold text-ink-900">
                Before you start
              </h2>
              <ul className="mt-3 space-y-2">
                {beforeYouStart.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-[#5A4D38]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1 w-3.5 shrink-0 rounded-full bg-gold-600"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10 border-t border-border pt-6">
              <h2 className="text-h4 font-semibold text-ink-900">Need help?</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                Use <Link to="/register/assisted" className="font-medium underline underline-offset-4">/register/assisted</Link>{' '}
                with a staff member. Your pass is issued at the arrival desk, not by email.
              </p>
            </section>
          </>
        )}

      </div>
    </>
  )
}
