import { event } from '../../content/event'

/**
 * WheelCard — the ink hero card. Carries the event's own line and supporting
 * statement (from the approved reference), set small and clean in the left
 * column, with the Konark wheel sitting fully inside the card on the right.
 * Decorative gradient only; no new colour introduced.
 * 158px tall on mobile, 390px on desktop.
 */
export function WheelCard() {
  return (
    <div className="relative h-[158px] overflow-hidden rounded-[14px] bg-ink-900 text-ivory-100 shadow-lg md:h-[390px] md:rounded-[22px]">
      {/* Radial accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(180px 120px at 80% 20%, rgba(56,189,248,.10), transparent 70%)',
        }}
      />

      {/* Event eyebrow — small, gold, tracked */}
      <span className="absolute left-4 top-3.5 z-10 text-[8.5px] font-bold uppercase tracking-[0.16em] text-gold-500 md:left-6 md:top-7 md:text-[9.5px]">
        {event.name}
      </span>

      {/* Konark wheel — stone-carving image, no background, aligned right-center */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-end pr-1 md:pr-7">
        <img
          src="/konark-wheel.webp"
          alt=""
          aria-hidden="true"
          className="h-[128px] w-[128px] object-contain opacity-95 drop-shadow-[0_0_22px_rgba(201,162,39,0.22)] md:h-[290px] md:w-[290px]"
        />
      </div>

      {/* Event line — smaller, tight, left aligned */}
      <div className="absolute bottom-3 left-4 z-10 max-w-[190px] md:bottom-7 md:left-6 md:max-w-[250px]">
        <p className="text-[14px] font-semibold leading-[1.18] tracking-[-0.015em] text-ivory-50 md:text-[19px] md:leading-[1.2]">
          {event.workingLine}
        </p>
        <p className="mt-1 hidden text-[10px] leading-[1.45] text-ivory-100/60 md:mt-2 md:block md:text-[10.5px]">
          {event.supportingLine}
        </p>
      </div>
    </div>
  )
}

export default WheelCard
