import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, MapPin, Ticket } from 'lucide-react'
import WheelCard from '../components/public/WheelCard'
import HeroBackdrop from '../components/public/HeroBackdrop'
import FeaturedWork from '../components/public/FeaturedWork'
import FaqAccordion from '../components/public/FaqAccordion'
import StepExplainer from '../components/public/StepExplainer'
import VenueMap from '../components/public/VenueMap'
import { SectionLabel, Eyebrow } from '../components/public/SectionLabel'
import { ActionLink } from '../components/ui/ActionLink'
import { Badge } from '../components/ui/Badge'
import { featuredFaqs, faqStatus } from '../content/faq'
import { venue } from '../content/venue'
import { event, platform } from '../content/event'

/** Curated golden & white glitter particles across the hero (matching user image 1 & 2). */
const HERO_SPARKLES = [
  // Top-left area (prominent sparkle star like Image 2)
  { top: '10%', left: '6%', size: 16, type: 'star', delay: '0s', duration: '3.2s' },
  { top: '15%', left: '11%', size: 4, type: 'dot', delay: '0.8s', duration: '2.6s' },
  // Upper mid
  { top: '8%', left: '42%', size: 4, type: 'dot', delay: '1.4s', duration: '3.8s' },
  { top: '22%', left: '38%', size: 12, type: 'star', delay: '2.1s', duration: '4s' },
  // Upper-right (above wheel card)
  { top: '9%', right: '12%', size: 14, type: 'star', delay: '0.4s', duration: '3.5s' },
  { top: '14%', right: '17%', size: 4, type: 'dot', delay: '1.9s', duration: '2.8s' },
  // Center-left (beside hero heading)
  { top: '38%', left: '3%', size: 5, type: 'dot', delay: '2.7s', duration: '3.1s' },
  { top: '48%', left: '46%', size: 11, type: 'star', delay: '1.1s', duration: '3.7s' },
  // Center-right
  { top: '50%', right: '7%', size: 5, type: 'dot', delay: '0.2s', duration: '4.2s' },
  { top: '62%', right: '24%', size: 13, type: 'star', delay: '2.4s', duration: '3.4s' },
  // Bottom-left area (near event card)
  { top: '74%', left: '4%', size: 12, type: 'star', delay: '1.7s', duration: '3.6s' },
  { top: '84%', left: '44%', size: 4, type: 'dot', delay: '0.6s', duration: '2.9s' },
  // Bottom-right
  { top: '86%', right: '14%', size: 4, type: 'dot', delay: '3.0s', duration: '3.3s' },
  { top: '91%', right: '35%', size: 10, type: 'star', delay: '1.5s', duration: '3.9s' },
]

/** Sticky bottom bar — mobile only, 78px + safe area (§7.1 mobile, mockup 03). */
function MobileStickyCta() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <div
      className="sticky-cta fixed inset-x-0 bottom-0 z-30 border-t border-border bg-ivory-100/97 px-[18px] pb-[env(safe-area-inset-bottom)] pt-2.5 backdrop-blur-sm lg:hidden"
      style={{ minHeight: '78px' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10.5px] font-semibold leading-tight text-ink-900">
            GeekAI registration
          </p>
          <p className="mt-0.5 truncate text-[9px] text-muted">For {event.shortName}</p>
        </div>
        <ActionLink to="/register" variant="primary" className="h-10 shrink-0 px-[15px] text-xs">
          Register interest
        </ActionLink>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <>
      {/* ---------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <HeroBackdrop>
          {/* Golden glitter & sparkles */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <svg className="absolute h-0 w-0">
              <defs>
                <radialGradient id="sparkle-gold-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="35%" stopColor="#FFF8DB" />
                  <stop offset="70%" stopColor="#EAB308" />
                  <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
            {HERO_SPARKLES.map((s, idx) => (
              <div
                key={idx}
                className={`absolute ${s.type === 'star' ? 'animate-sparkle-pulse' : 'animate-sparkle-twinkle'}`}
                style={{
                  top: s.top,
                  left: s.left,
                  right: s.right,
                  animationDelay: s.delay,
                  animationDuration: s.duration,
                }}
              >
                {s.type === 'star' ? (
                  <svg
                    width={s.size}
                    height={s.size}
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{
                      filter:
                        'drop-shadow(0 0 3px rgba(254, 240, 138, 0.95)) drop-shadow(0 0 8px rgba(201, 162, 39, 0.75))',
                    }}
                  >
                    <path
                      d="M12 0C12 7.5 7.5 12 0 12C7.5 12 12 16.5 12 24C12 16.5 16.5 12 24 12C16.5 12 12 7.5 12 0Z"
                      fill="url(#sparkle-gold-glow)"
                    />
                    <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
                  </svg>
                ) : (
                  <span
                    className="block rounded-full bg-[#FFFFFF]"
                    style={{
                      width: s.size,
                      height: s.size,
                      boxShadow:
                        '0 0 4px 1.5px rgba(255, 255, 255, 0.95), 0 0 10px 3px rgba(201, 162, 39, 0.85), 0 0 16px 5px rgba(234, 179, 8, 0.45)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </HeroBackdrop>

        <div className="container-wide relative grid items-center gap-10 py-9 md:py-14 lg:grid-cols-[1.03fr_.97fr] lg:gap-[70px] lg:items-start lg:py-16">
          <div className="lg:pb-1">
            <Eyebrow>{platform.eyebrow}</Eyebrow>

            <h1 className="mt-3 text-display font-semibold text-ink-900">
              Registration,
              <br />
              handled by GeekAI.
            </h1>

            <p className="mt-4.5 max-w-[500px] text-lead text-slate-700">
              {platform.purpose} — an in-site form, a clear status page and a pass issued at the
              arrival desk.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 lg:gap-5">
              <ActionLink to="/register" size="lg" className="w-full justify-center sm:w-auto">
                Register interest
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ActionLink>
            </div>

            {/* ----------------- Event Intelligence Deck (Unified Architectural Console) ----------------- */}
            <div className="mt-8 max-w-xl overflow-hidden rounded-xl border border-sand-300/80 bg-paper/95 shadow-[0_4px_20px_-4px_rgba(11,31,58,0.06)] backdrop-blur-md transition-all duration-300 hover:border-gold-500/40 hover:shadow-[0_8px_24px_-4px_rgba(11,31,58,0.09)]">
              {/* Top ambient gold accent line */}
              <div
                aria-hidden="true"
                className="h-[1.5px] w-full bg-gradient-to-r from-gold-500/60 via-gold-500/30 to-teal-500/40"
              />

              {/* Three Event Facts */}
              <ul className="grid grid-cols-1 divide-y divide-sand-200/80 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
                {/* Schedule */}
                <li className="flex flex-col justify-between p-3.5 transition-colors hover:bg-sand-50/50">
                  <div className="flex items-center gap-1.5 text-gold-700">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-muted">
                      Schedule
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] font-semibold text-ink-900 leading-snug">
                    {event.dateLabel}
                  </p>
                </li>

                {/* Venue */}
                <li className="flex flex-col justify-between p-3.5 transition-colors hover:bg-sand-50/50">
                  <div className="flex items-center gap-1.5 text-teal-700">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-muted">
                      Venue
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] font-semibold text-ink-900 leading-snug line-clamp-2">
                    {event.venue.label}
                  </p>
                </li>

                {/* Admission */}
                <li className="flex flex-col justify-between p-3.5 transition-colors hover:bg-sand-50/50">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-ink-800">
                      <Ticket className="h-3.5 w-3.5 shrink-0 text-gold-600" aria-hidden="true" />
                      <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-muted">
                        Access
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full ring-1 ring-teal-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] font-semibold text-ink-900 leading-snug">
                    In person · registration required
                  </p>
                </li>
              </ul>

              {/* Bottom Integrated Portal Dispatch Notice */}
              <div className="border-t border-sand-200/80 bg-gradient-to-r from-sand-100/70 via-sand-50/50 to-sand-100/60 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-ink-900/5 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-ink-800 ring-1 ring-ink-900/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    {platform.status}
                  </span>
                  <span className="text-[12.5px] font-bold text-ink-900">
                    {event.name}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  Event details come from the event team;{' '}
                  <span className="font-medium text-ink-900">
                    GeekAI operates this registration portal only.
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="lg:pr-7">
            <WheelCard />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Featured work */}
      <FeaturedWork />

      {/* --------------------------------------------------- How it works */}
      <section className="border-y border-border bg-paper">
        <div className="container-wide py-12 md:py-16">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-3 max-w-2xl text-h3 font-semibold tracking-[-0.02em] text-ink-900">
            From the form to the arrival desk.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-700">
            The GeekAI portal takes your details, photo and consent in a few minutes. The event
            team reviews them, and your pass is issued in person at the arrival desk — nothing is
            emailed to you before the event.
          </p>
          <div className="mt-9">
            <StepExplainer />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Venue */}
      <section className="container-wide border-b border-border py-12 md:py-15">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Venue</SectionLabel>
            <h2 className="mt-3 text-h3 font-semibold tracking-[-0.02em] text-ink-900">
              {venue.heading}
            </h2>
          </div>
          <p className="max-w-[280px] text-right text-xs leading-relaxed text-muted">
            {venue.note}
          </p>
        </div>

        <div className="mt-6.5 grid items-stretch gap-9 lg:grid-cols-[1.08fr_.92fr] lg:gap-12">
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
                    {row.note && (
                      <span className="mt-1 block text-xs text-muted">{row.note}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Accessibility note (mockup 02) */}
            <div className="mt-4 flex gap-3 rounded-lg border border-sand-200 bg-sand-100 p-3.5">
              <span
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-gold-600"
              />
              <p className="text-[11.5px] leading-relaxed text-[#5A4D38]">{venue.accessNote}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ActionLink to="/venue" variant="secondary" size="sm">
                Travel notes
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ActionLink>
              <ActionLink to="/faq" variant="link" size="sm">
                Contact the team
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ActionLink>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ FAQ */}
      <section className="container-wide py-12 md:py-15">
        <div className="grid gap-9 lg:grid-cols-[330px_1fr] lg:gap-16">
          <div>
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-3 text-h2 font-semibold text-ink-900">{faqStatus.heading}</h2>
            <p className="mt-3 max-w-[270px] text-xs leading-relaxed text-muted">
              {faqStatus.body}
            </p>
            <div className="mt-3.5">
              <ActionLink to="/faq" variant="link" size="sm">
                Contact the team
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ActionLink>
            </div>
          </div>
          <div>
            <FaqAccordion items={featuredFaqs} idPrefix="home-faq" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ CTA band */}
      <section className="bg-ink-900 text-ivory-50">
        <div className="container-wide flex flex-col items-start gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-14">
          <div>
            <SectionLabel onDark>Registration</SectionLabel>
            <h2 className="mt-3 text-h3 font-semibold tracking-[-0.02em]">Registration required.</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ivory-100/76">
              Entry is in person only. Register through the GeekAI portal; your pass is issued
              at the arrival desk. {event.dateLabel} — expressions of interest are open.
            </p>
          </div>
          <ActionLink to="/register" variant="gold" size="lg" className="shrink-0">
            Register interest
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ActionLink>
        </div>
      </section>

      <MobileStickyCta />
      {/* Space for the sticky bar on small screens */}
      <div aria-hidden="true" className="h-[78px] lg:hidden" />
    </>
  )
}