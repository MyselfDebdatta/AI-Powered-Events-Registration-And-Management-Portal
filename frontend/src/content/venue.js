/**
 * Venue content — facts the venue has confirmed, plus honest placeholders
 * for everything else (FrontendPlanning.md §7.1: no invented address,
 * arrival desk location, transport or accessibility details).
 */

export const venue = {
  heading: 'Find your way in.',
  note: 'Arrival, accessibility and travel notes will be published before the event.',
  rows: [
    {
      key: 'Venue',
      title: 'ITER, SOA University',
      body: 'Bhubaneswar, Odisha',
    },
    {
      key: 'Arrival',
      body: 'Arrival desk location to be announced.',
      note: 'Signage and support details to be announced.',
    },
    {
      key: 'Getting here',
      body: 'Travel notes, parking and public transport details will be published.',
    },
    {
      key: 'Accessibility',
      body: 'Accessibility contact to be announced.',
    },
  ],
  accessNote:
    'Accessibility notes, arrival support and contact details will be published before the event.',
  map: {
    pinLabel: 'ITER, SOA University',
    deskLabel: 'Arrival desk',
    scaleLabel: 'Bhubaneswar · not to scale',
  },
}

export default venue
