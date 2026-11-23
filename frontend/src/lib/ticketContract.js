/**
 * ticketContract — normalizes `GET /api/tickets/{token}` (WorkFlow.md §9.1)
 * into the shape the participant screens render.
 *
 * The endpoint ships after this frontend, so the mapper is deliberately
 * tolerant about key spelling and explicit about unknowns: an unrecognised
 * payload resolves to `UNSUPPORTED`/`UNKNOWN`, which the pages render as an
 * honest panel — never as invented data (§7.1 content rules).
 */

const REGISTRATION_STATES = [
  'RECEIVED',
  'IN_REVIEW',
  'CONFIRMED',
  'WAITLISTED',
  'NEEDS_INFO',
  'REJECTED',
  'CANCELLED',
]

const TICKET_STATES = ['NOT_ISSUED', 'ISSUED', 'USED', 'EXPIRED', 'REVOKED']

/** First defined, non-empty value. */
function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

function asText(value) {
  return value === null || value === undefined ? null : String(value)
}

/**
 * normalizeTicketResponse(raw, token) →
 * {
 *   token, registrationStatus, ticketStatus,
 *   reference, email, submittedAt,
 *   name, passId,
 *   issuedAt, usedAt, expiresAt,
 *   scope, entry, sessions,
 * }
 *
 * registrationStatus: one of REGISTRATION_STATES | 'UNKNOWN' | 'UNSUPPORTED'
 * ticketStatus: one of TICKET_STATES | 'UNKNOWN'
 */
export function normalizeTicketResponse(raw, token) {
  const source = raw && typeof raw === 'object' ? raw : {}

  const regRaw = asText(
    pick(source.registration_status, source.registrationStatus, source.status, source.state)
  )?.toUpperCase()
  const ticketRaw = asText(
    pick(source.ticket_status, source.ticketStatus, source.pass_status, source.pass, source.ticket)
  )?.toUpperCase()

  let registrationStatus = 'UNKNOWN'
  if (regRaw) {
    registrationStatus = REGISTRATION_STATES.includes(regRaw) ? regRaw : 'UNSUPPORTED'
  }

  let ticketStatus = 'UNKNOWN'
  if (ticketRaw) {
    ticketStatus = TICKET_STATES.includes(ticketRaw) ? ticketRaw : 'UNKNOWN'
  } else if (registrationStatus === 'CONFIRMED') {
    // Confirmed but no pass data yet — the pass is issued at the arrival desk.
    ticketStatus = 'NOT_ISSUED'
  }

  const participant = source.participant && typeof source.participant === 'object' ? source.participant : {}

  return {
    token,
    registrationStatus,
    ticketStatus,
    reference: asText(pick(source.reference, source.ref, source.registration_reference)),
    email: asText(pick(source.email, source.participant_email)),
    submittedAt: asText(pick(source.submitted_at, source.submittedAt, source.created_at)),
    name: asText(pick(participant.name, source.name, source.participant_name)),
    passId: asText(pick(participant.pass_id, source.pass_id, source.passId, source.ticket_id)),
    issuedAt: asText(pick(source.issued_at, source.issuedAt)),
    usedAt: asText(pick(source.used_at, source.usedAt, source.checked_in_at)),
    expiresAt: asText(pick(source.expires_at, source.expiresAt)),
    scope: asText(pick(source.scope)) ?? 'Entry · sessions',
    entry: asText(pick(source.entry)) ?? null,
    sessions: asText(pick(source.sessions)) ?? null,
  }
}

/**
 * Demo payloads — review-only sample data behind `demo` tokens, so the
 * participant screens can be reviewed before `GET /api/tickets/{token}`
 * ships. They render only while `flags.ticketPage` is ON (dev default; OFF
 * in production) and both pages label the screen as a demo. The values are
 * the mockups' own placeholders — never a claim about a real person.
 *
 *   /registration/status?token=demo       → IN_REVIEW state (mockup 04)
 *   /registration/status?token=demo-pass  → CONFIRMED state
 *   /ticket/demo                          → pass not issued yet
 *   /ticket/demo-pass                     → issued pass with QR (mockup 05)
 */
export const DEMO_TOKENS = {
  demo: {
    registration_status: 'IN_REVIEW',
    ticket_status: 'NOT_ISSUED',
    reference: 'AIS26-DEMO',
    email: 'demo@example.com',
    name: 'Demo Participant',
  },
  'demo-pass': {
    registration_status: 'CONFIRMED',
    ticket_status: 'ISSUED',
    reference: 'AIS26-DEMO',
    email: 'demo@example.com',
    name: 'Demo Participant',
    pass_id: 'AIS26-XXXX',
    scope: 'Entry · sessions',
  },
}

export function isDemoToken(token) {
  return Boolean(token) && Object.prototype.hasOwnProperty.call(DEMO_TOKENS, token)
}

export default normalizeTicketResponse
