/**
 * Single source of truth for static facts.
 *
 * This site is the GeekAI registration portal — built and operated by the
 * GeekAI Developer Team. It is NOT the official Odisha AI Symposium website.
 * It currently handles registration for Odisha AI Symposium 2026. The `event`
 * block below describes the event currently being served; the `platform`
 * block describes the portal itself.
 *
 * Never hard-code a date, venue address or contact in a component. Unconfirmed
 * facts stay explicitly labelled; nothing is invented.
 */

const env = import.meta.env

/** The product: GeekAI's registration platform. */
export const platform = {
  name: 'GeekAI Registration Portal',
  shortName: 'GeekAI',
  owner: 'GeekAI Developer Team',
  eyebrow: 'GeekAI · Registration portal',
  line: 'Registration, handled with care.',
  purpose:
    'Built and operated by the GeekAI Developer Team for registration and registration management at partner events.',
  status: 'Currently serving',
}

/** The event currently being served by the portal. */
export const event = {
  name: 'Odisha AI Symposium 2026',
  shortName: 'OAIS 2026',
  edition: '2026',
  workingLine: 'Intelligence, rooted in Odisha.',
  supportingLine:
    'A symposium on artificial intelligence that serves place, people and public good.',

  // Unconfirmed facts are stated honestly, never invented.
  dateLabel: 'Date to be announced',
  date: null, // ISO string once confirmed: '2026-03-14'
  timeLabel: 'Time to be announced',

  venue: {
    institution: 'ITER, SOA University',
    city: 'Bhubaneswar',
    region: 'Odisha',
    country: 'India',
    label: 'ITER, SOA University, Bhubaneswar',
    address: null, // confirmed address pending from the event team
    // Real Google Maps directions target for ITER, SOA University.
    directionsUrl:
      'https://www.google.com/maps/dir/?api=1&destination=ITER%2C%20SOA%20University%2C%20Bhubaneswar%2C%20Odisha&travelmode=driving',
    mapUrl: null,
  },

  hosts: ['SOA University', 'AIC for Innovation Center'],
  hostLine: 'Presented by SOA University & AIC for Innovation Center',
  locationLine: 'Bhubaneswar, Odisha · 2026',

  // Official hosts' websites for the top-strip logo links (verified public URLs).
  hostLinks: {
    soa: 'https://www.soa.ac.in',
    // The official Odisha AI Conference (OAIC) 2026 site is published.
    official: env.VITE_OAIS_OFFICIAL_URL || 'https://www.oaic.in/',
  },

  // Alias used by the Featured Work card.
  officialUrl: env.VITE_OAIS_OFFICIAL_URL || 'https://www.oaic.in/',

  registration: {
    // The in-site React form is the only intake. No external form URL.
    required: true,
    closed: env.VITE_REGISTRATION_CLOSED === 'true',
    passIssuedAt: 'the arrival desk',
  },

  contact: {
    // Not invented: set VITE_CONTACT_EMAIL when the event team confirms it.
    email: env.VITE_CONTACT_EMAIL || '',
    label: 'Contact the event team',
    supportLabel: 'Contact support',
  },

  links: {
    privacy: '/privacy',
    accessibility: '/accessibility',
    codeOfConduct: '/code-of-conduct',
    status: '/registration/status',
    staffLogin: '/login',
  },
}

export default event
