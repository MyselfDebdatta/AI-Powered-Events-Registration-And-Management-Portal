import flags from '../../content/flags'
import { Card } from '../../components/ui/Card'
import { WaitingForBackend } from '../../components/volunteer/WaitingForBackend'
import { Sliders } from 'lucide-react'
import event from '../../content/event'

/** Settings — flag-gated; the backend has no settings endpoint yet. */
export default function Settings() {
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Settings</h2>
        <p className="mt-0.5 text-[11px] text-muted">Event configuration and desk settings.</p>
      </div>
      <Card variant="paper" padded className="p-4">
        <h3 className="text-[12px] font-semibold text-ink-900">Event</h3>
        <dl className="mt-2 space-y-1.5 text-[11px]">
          {[
            ['Name', event.name],
            ['Short name', event.shortName],
            ['Venue', `${event.venue.institution}, ${event.venue.city}`],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-wrap gap-2">
              <dt className="w-24 shrink-0 text-muted">{label}</dt>
              <dd className="font-medium text-ink-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {!flags.settingsV2 ? (
        <WaitingForBackend title="Editable settings are waiting for the hub" endpoints={['GET /api/admin/settings']} />
      ) : (
        <Card variant="paper" padded className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <Sliders className="h-3.5 w-3.5" aria-hidden="true" /> Settings can be changed when the service is live.
          </p>
        </Card>
      )}
    </div>
  )
}
