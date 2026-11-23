import { ClipboardCheck, ScanFace, LayoutDashboard, DoorOpen, ArrowRight } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * StepExplainer — the 4-step journey, presented as a connected set of cards.
 * Register → Complete profile → Watch approval → Check in on site.
 * Each card is a self-contained step with a large index, its own accent and a
 * quiet hover lift. The thin rail between cards reads as a single journey on
 * desktop; cards stack cleanly on mobile. Copy keeps the truthful rule: the
 * pass is issued at arrival, never emailed.
 */
const steps = [
  {
    step: '01',
    label: 'STEP 01',
    title: 'Register',
    body: 'Complete the registration form on this site with your details, a recent photo and your consent.',
    icon: ClipboardCheck,
    tone: 'gold',
  },
  {
    step: '02',
    label: 'STEP 02',
    title: 'Complete your profile',
    body: 'We check the photo and details you submitted so the desk can match them on arrival.',
    icon: ScanFace,
    tone: 'teal',
  },
  {
    step: '03',
    label: 'STEP 03',
    title: 'Watch for approval',
    body: 'The event team reviews each response. The GeekAI portal keeps your status up to date.',
    icon: LayoutDashboard,
    tone: 'ink',
  },
  {
    step: '04',
    label: 'STEP 04',
    title: 'Check in on site',
    body: 'Your pass is issued at the arrival desk. Bring a photo ID and your registration email.',
    icon: DoorOpen,
    tone: 'gold',
  },
]

const TONES = {
  gold: { chip: 'bg-gold-100 text-gold-700 ring-gold-500/25' },
  teal: { chip: 'bg-teal-100 text-teal-600 ring-teal-500/25' },
  ink: { chip: 'bg-sand-100 text-ink-900 ring-ink-900/15' },
}

export function StepExplainer() {
  return (
    <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
      {steps.map((item, idx) => {
        const Icon = item.icon
        const tone = TONES[item.tone]
        return (
          <li key={item.step} className="group relative">
            <div
              className={cn(
                'relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-paper p-5',
                'shadow-[0_2px_10px_-6px_rgba(11,31,58,0.18)]',
                'transition-all duration-300 ease-out',
                'hover:-translate-y-1 hover:border-gold-500/40 hover:shadow-[0_14px_30px_-14px_rgba(11,31,58,0.30)]'
              )}
            >
              <span
                className={cn(
                  'relative grid h-11 w-11 place-items-center rounded-lg ring-1',
                  tone.chip
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>

              <span className="relative mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {item.label}
              </span>
              <h3 className="relative mt-1.5 text-h4 font-semibold text-ink-900">{item.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-700">{item.body}</p>

              {/* Footer cue */}
              <span className="relative mt-auto pt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-900 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {idx < steps.length - 1 ? 'Next step' : 'You are ready'}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default StepExplainer
