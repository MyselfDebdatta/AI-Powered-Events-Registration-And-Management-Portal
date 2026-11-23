import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Banner } from '../components/ui/Banner'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { KonarkMark } from '../components/public/KonarkMark'

/**
 * DesignSystem — dev-only token/primitive reference (Phase 0 exit criterion).
 * Registered only when import.meta.env.DEV is true; never shipped in production.
 */
const SWATCHES = [
  ['ink-900', '#0B1F3A', 'Primary text / chrome'],
  ['ink-800', '#12294A', 'Dark surfaces'],
  ['ivory-100', '#F7F3EA', 'Page canvas'],
  ['paper', '#FFFDF8', 'Cards'],
  ['gold-700', '#6B5508', 'Gold text on light'],
  ['gold-500', '#C9A227', 'Graphics on ink'],
  ['teal-600', '#0A6261', 'Verified / live text'],
  ['teal-500', '#0E7C7B', 'Live graphics'],
  ['amber-600', '#B45309', 'Needs attention'],
  ['red-600', '#DC2626', 'Failure / destructive'],
]

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64]

export default function DesignSystem() {
  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-6 p-4 lg:p-6">
      <div className="border-b border-border pb-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gold-700">
          Development only
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink-900">
          Design system
        </h1>
        <p className="mt-0.5 text-[11px] text-muted">
          Tokens and primitives — FrontendPlanning §5. This route is not in the production build.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-ink-900">Palette</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {SWATCHES.map(([name, hex, use]) => (
            <div key={name} className="overflow-hidden rounded-md border border-border bg-paper">
              <div className="h-12 w-full" style={{ backgroundColor: hex }} />
              <div className="p-2">
                <p className="font-mono text-[10px] font-semibold text-ink-900">{name}</p>
                <p className="font-mono text-[9px] text-muted">{hex}</p>
                <p className="mt-0.5 text-[9px] text-muted">{use}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-ink-900">Type &amp; brand</h2>
        <Card variant="paper" padded className="p-4">
          <div className="flex items-center gap-3">
            <KonarkMark className="h-10 w-10 text-gold-600" strokeWidth={1.4} />
            <div>
              <p className="text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink-900">
                Intelligence, rooted in Odisha
              </p>
              <p className="mt-1 text-[12px] text-muted">Display · 24px · semibold · -0.03em</p>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-ink-900">Buttons</h2>
        <Card variant="paper" padded className="flex flex-wrap items-center gap-2 p-4">
          <Button>Primary ink</Button>
          <Button variant="gold">Issue QR pass (gold)</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-ink-900">Badges &amp; banner</h2>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {['neutral', 'gold', 'teal', 'amber', 'red', 'grey', 'outline'].map((tone) => (
              <Badge key={tone} tone={tone} dot>
                {tone}
              </Badge>
            ))}
          </div>
          <Banner tone="info" title="Information">
            Plain, actionable copy.
          </Banner>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-ink-900">Form controls</h2>
        <Card variant="paper" padded className="grid gap-3 p-4 sm:grid-cols-2">
          <Input label="Text input" placeholder="Placeholder" />
          <Select
            label="Select"
            placeholder="Choose…"
            options={[
              { value: '1', label: 'Option one' },
              { value: '2', label: 'Option two' },
            ]}
          />
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-ink-900">Spacing scale</h2>
        <Card variant="paper" padded className="flex flex-wrap items-end gap-2 p-4">
          {SPACING.map((step) => (
            <div key={step} className="text-center">
              <div className="bg-teal-500" style={{ width: step, height: step }} />
              <p className="mt-1 font-mono text-[9px] text-muted">{step}</p>
            </div>
          ))}
        </Card>
      </section>
    </div>
  )
}
