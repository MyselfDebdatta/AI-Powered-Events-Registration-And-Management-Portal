import { ArrowUpRight, ExternalLink } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { featuredWork } from '../../content/featuredWork'
import { platform } from '../../content/event'

/**
 * FeaturedWork — events whose registration is managed by the GeekAI team.
 * One card per event; the list in content/featuredWork.js is the single place
 * to add future events. Each poster links to that event's own official site,
 * never to this registration portal.
 */
export function FeaturedWork() {
  return (
    <section className="container-wide py-10 md:py-13" aria-labelledby="featured-work-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-gold-700">
            Our work
          </span>
          <h2
            id="featured-work-heading"
            className="mt-1.5 text-h3 font-semibold tracking-[-0.025em] text-ink-900"
          >
            Featured work
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-700">
            {platform.owner} builds and operates registration portals for events. Here is one we
            are running now.
          </p>
        </div>
        <Badge tone="neutral" className="text-[10px]">
          {featuredWork.length} event{featuredWork.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featuredWork.map((work) => (
          <li key={work.id}>
            <article className="group h-full overflow-hidden rounded-xl border border-border bg-paper shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_-14px_rgba(11,31,58,0.28)]">
              <div className="relative overflow-hidden bg-sand-100">
                <img
                  src={work.poster}
                  alt={work.posterAlt}
                  className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                {work.current && (
                  <span className="absolute left-3 top-3 rounded-full bg-teal-600 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                    Current
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  {work.role}
                </p>
                <h3 className="mt-1.5 text-base font-semibold text-ink-900">{work.eventName}</h3>
                <div className="mt-4">
                  {work.officialUrl ? (
                    <a
                      href={work.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-ink-900 px-3.5 text-[12px] font-semibold text-ivory-50 transition-colors hover:bg-ink-800"
                      aria-label={`Visit the ${work.eventName} official website (opens in a new tab)`}
                    >
                      Visit official site
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-border-control px-3.5 text-[12px] font-semibold text-muted"
                      title="The official event link has not been published yet"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      Official link to be announced
                    </span>
                  )}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default FeaturedWork
