import { event } from '../../content/event'

/**
 * VenueMap — a real, embedded Google Map of ITER, SOA University with one
 * action: "Get directions", which opens Google Maps directions for the venue.
 * The embed needs no API key; the destination is the confirmed institution,
 * not an invented address.
 */
export function VenueMap() {
  const { institution, city, region, directionsUrl } = event.venue
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    `${institution}, ${city}, ${region}`
  )}&output=embed`

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-paper shadow-sm">
      <iframe
        title={`Google Map of ${institution}, ${city}`}
        src={embedUrl}
        className="block h-[220px] w-full border-0 lg:h-[300px]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3.5 py-3">
        <p className="min-w-0 text-[11px] leading-relaxed text-muted">
          {institution} · {city}, {region}
        </p>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-ink-900 px-4 text-xs font-semibold text-ivory-50 transition-colors duration-fast hover:bg-ink-800"
        >
          Get directions
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  )
}

export default VenueMap
