import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  LifeBuoy,
  Mail,
  Printer,
  QrCode,
  ScanFace,
  ShieldCheck,
  WifiOff,
} from 'lucide-react'
import event from '../../content/event'
import { Banner } from '../../components/ui/Banner'
import { Badge } from '../../components/ui/Badge'

/**
 * Help — `/volunteer/help` (§7.5 runbook).
 * The event-day answers a volunteer needs without leaving the desk, written
 * as plain steps. No contact details are invented: if the host office has not
 * published an address, the panel says so.
 */

const RUNBOOK = [
  {
    id: 'flow',
    icon: ScanFace,
    title: 'The 30-second arrival flow',
    body: [
      'Open Arrival. Start the camera when the participant is ready and ask them to remove glasses.',
      'Capture and verify. Look at the candidate photo and a second identifier (name, institution or ID).',
      'Press “This is the person”, then “Issue QR pass”. Gold is only for that issue action.',
      'Hand over the pass, or print a badge. Press “Next participant” to reset the desk.',
    ],
  },
  {
    id: 'camera',
    icon: Camera,
    title: 'If the camera will not start',
    body: [
      'Allow camera permission in the browser, then press Retry camera.',
      'If another app is using the camera, close it and retry.',
      'Use Upload photo for a still, or Manual lookup if there is no camera at all.',
      'Manual fallback requires a photo ID check and a recorded reason.',
    ],
  },
  {
    id: 'offline',
    icon: WifiOff,
    title: 'If the network drops',
    body: [
      'The amber pill shows “Offline — N pending”. The capture is saved on this device.',
      'A saved arrival is not a pass: no QR exists until the hub returns and signs it.',
      'Open Queue to see every saved record. Retry now reuses the same client event ID.',
      'Do not discard a record unless the participant is still at the desk and you will verify again.',
    ],
  },
  {
    id: 'printer',
    icon: Printer,
    title: 'If the badge printer fails',
    body: [
      'Show the pass on screen instead. The QR is the entry credential.',
      'Print badge opens the CR80 badge; the QR only prints for an issued pass.',
      'If the printer stays offline, note the participant and tell the desk lead. Do not retry the issue action.',
    ],
  },
  {
    id: 'scan',
    icon: QrCode,
    title: 'If a pass will not scan',
    body: [
      'Entry is one-time. “Already checked in” is a duplicate, not an error to override.',
      'Session passes are once per participant per session.',
      '“Invalid pass” means the QR is not a signed pass. Do not accept a screenshot of text or JSON.',
      'Use Manual lookup, verify the photo ID, and record the fallback.',
    ],
  },
  {
    id: 'words',
    icon: ShieldCheck,
    title: 'What to say — and what never to say',
    body: [
      'Say “Entry recorded” only when the scanner says so.',
      'After issuing a pass, the status is QR issued — not checked in.',
      'Say “Your pass is saved and will be issued when the desk reconnects” when offline.',
      'Never say a pass was emailed. The desk issues it here.',
    ],
  },
]

function Step({ index, children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border-strong font-mono text-[9px] text-muted">
        {index}
      </span>
      <span className="text-[12.5px] leading-relaxed text-slate-700">{children}</span>
    </li>
  )
}

export default function Help() {
  return (
    <div className="mx-auto w-full max-w-[860px] space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-sand-100 text-ink-700">
          <LifeBuoy className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink-900">
            Desk runbook
          </h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Event-day answers for {event.shortName}. Keep this open on the desk.
          </p>
        </div>
      </div>

      <Banner tone="info" title="Volunteer confirmation required">
        Face match suggests; a person decides. The screen never auto-selects a candidate and
        never issues a pass without the gold action.
      </Banner>

      {/* 90-second briefing — the five things a volunteer must know (Phase 5). */}
      <section className="overflow-hidden rounded-md border border-gold-500/40 bg-paper shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-gold-100 px-4 py-2.5">
          <h2 className="text-[14px] font-semibold text-ink-900">90-second briefing</h2>
          <Badge tone="gold" className="text-[9.5px]">Read before your first participant</Badge>
        </div>
        <ol className="space-y-2 px-4 py-3">
          {[
            'Open Arrival. The camera stays off until you press Start camera.',
            'Capture a face, then compare the candidate photo with a second ID. Face match is a suggestion.',
            'Press “This is the person”, choose how you checked ID, then the gold “Issue QR pass”.',
            'Show the pass or print a badge. “Next participant” resets the desk.',
            'If the hub drops: the capture is saved locally, no QR exists yet, and Queue shows the count. Never say “checked in”.',
          ].map((line, index) => (
            <Step key={line} index={index + 1}>
              {line}
            </Step>
          ))}
        </ol>
        <p className="border-t border-border px-4 py-2 text-[10px] text-muted">
          This briefing is printed at the desk with the runbook. Questions? Ask the desk lead before
          issuing a pass.
        </p>
      </section>

      <div className="space-y-2">
        {RUNBOOK.map((section) => {
          const Icon = section.icon
          return (
            <details
              key={section.id}
              open={section.id === 'flow'}
              className="group rounded-md border border-border bg-paper shadow-sm open:shadow-md"
            >
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-sand-100 text-ink-700">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex-1 text-[13.5px] font-semibold text-ink-900">
                  {section.title}
                </span>
                {section.id === 'offline' && (
                  <Badge tone="amber" className="hidden text-[9.5px] sm:inline-flex">
                    Offline
                  </Badge>
                )}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <ol className="space-y-2 border-t border-border px-4 py-3">
                {section.body.map((line, index) => (
                  <Step key={line} index={index + 1}>
                    {line}
                  </Step>
                ))}
              </ol>
            </details>
          )
        })}
      </div>

      <section className="rounded-md border border-border bg-paper p-4 shadow-sm">
        <h2 className="text-[13px] font-semibold text-ink-900">Go straight to a screen</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { to: '/volunteer/arrival', label: 'Arrival desk' },
            { to: '/volunteer/scan', label: 'Scan' },
            { to: '/volunteer/manual', label: 'Manual lookup' },
            { to: '/volunteer/queue', label: 'Pending sync' },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="inline-flex min-h-9 items-center rounded-sm border border-border-control px-3 text-[12px] font-semibold text-ink-900 hover:bg-sand-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-border bg-paper p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
          <Mail className="h-4 w-4 text-gold-600" aria-hidden="true" />
          Escalation
        </h2>
        {event.contact.email ? (
          <p className="mt-1 text-[12px] text-slate-700">
            Contact the host office at{' '}
            <a
              href={`mailto:${event.contact.email}`}
              className="font-semibold text-ink-900 underline underline-offset-2"
            >
              {event.contact.email}
            </a>
            . Include the participant ID and what the screen said.
          </p>
        ) : (
          <p className="mt-1 text-[12px] text-slate-700">
            No public contact address has been published yet. Use the event operations channel
            shared at the volunteer briefing, and include the participant ID and what the screen
            said.
          </p>
        )}
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
          If identity is unclear, stop. Do not issue a pass on name alone; escalate to the desk lead.
        </p>
      </section>
    </div>
  )
}
