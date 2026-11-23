/**
 * Featured work — events whose registration is managed by the GeekAI team.
 *
 * This is an extensible list: add a new entry for each future event the portal
 * serves. Each card shows the event poster and, when an official URL is
 * configured, links out to that event's own website (never to this portal).
 *
 * No official URL is invented — the value comes from the event's config. The
 * poster is the supplied OAIS 2026 theme artwork, stored locally so the site
 * has no external image dependency.
 */

import { event } from './event'

export const featuredWork = [
  {
    id: 'oais-2026',
    eventName: 'Odisha AI Symposium 2026',
    shortName: 'OAIS 2026',
    role: 'Registration & attendee management',
    poster: '/oais-2026-poster.webp',
    posterAlt:
      'Odisha AI Symposium 2026 poster — the Jagannath temple at sunrise in warm gold',
    officialUrl: event.officialUrl,
    current: true,
  },
]

export default featuredWork
