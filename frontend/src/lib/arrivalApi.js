import client, { normalizeError } from '../api/client'
import { readQueue, removeQueueItem, updateQueueItem } from './outbox'

/**
 * arrivalApi — the only place the volunteer screens talk to the arrival and
 * QR contracts (WorkFlow.md §9.1). Endpoint names are fixed; the UI never
 * invents a parallel route.
 *
 * Live today:      POST /api/attendance/face-match
 *                  POST /api/attendance/
 *                  GET  /api/participants/
 *                  GET  /api/sessions/
 * Awaiting hub:    POST /api/arrivals
 *                  POST /api/qr/issue
 *                  POST /api/qr/verify
 *                  POST /api/attendance/{id}/void
 */

const THRESHOLD = 0.4

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

export function isEndpointMissing(error) {
  const status = normalizeError(error).status
  return status === 404 || status === 405 || status === 501
}

export function isOffline(error) {
  return normalizeError(error).isNetwork
}

/** Normalize a participant from any of the staff endpoints. */
export function normalizeParticipant(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = pick(raw.id, raw.participant_id)
  if (id === null) return null
  return {
    id,
    name: pick(raw.name, raw.participant_name) ?? 'Participant',
    email: pick(raw.email) ?? null,
    phone: pick(raw.phone) ?? null,
    institution: pick(raw.institution) ?? null,
    category: pick(raw.category) ?? null,
    photoUrl: pick(raw.photo_url),
    registeredAt: pick(raw.registered_at),
    status: pick(raw.status, raw.ticket_status),
  }
}

/** `/attendance/face-match` → candidates + confidence metadata. */
export function normalizeMatchResponse(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const threshold = Number(pick(source.threshold, source.match_threshold)) || THRESHOLD
  const list = Array.isArray(source.candidates)
    ? source.candidates
    : source.participant
      ? [source.participant]
      : []

  const candidates = list
    .map((entry) => {
      const participant = normalizeParticipant(entry.participant ?? entry)
      if (!participant) return null
      const score = Number(
        pick(entry.similarity, entry.score, entry.confidence, source.similarity)
      )
      return {
        participant,
        score: Number.isFinite(score) ? score : null,
      }
    })
    .filter(Boolean)

  const best = candidates.reduce(
    (max, item) => (item.score !== null && (max === null || item.score > max) ? item.score : max),
    null
  )

  return {
    matched: Boolean(source.matched ?? candidates.length),
    candidates,
    threshold,
    similarity: Number.isFinite(Number(source.similarity)) ? Number(source.similarity) : best,
    lowConfidence: Boolean(source.low_confidence ?? source.lowConfidence),
    alreadyArrived: Boolean(
      source.already_arrived ??
        source.alreadyArrived ??
        ['ARRIVED', 'QR_ISSUED', 'CHECKED_IN'].includes(
          String(source.status ?? '').toUpperCase()
        )
    ),
    alreadyArrivedAt: pick(source.arrived_at, source.arrivedAt),
    alreadyCheckedIn: Boolean(source.already_checked_in ?? source.alreadyCheckedIn),
    alreadyCheckedInAt: pick(source.checked_in_at, source.checkedInAt),
    message: pick(source.message, source.reason),
  }
}

/** `/qr/issue` → the signed token and readable pass ID. */
export function normalizeIssuedPass(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const nested = source.qr && typeof source.qr === 'object' ? source.qr : {}
  return {
    token: pick(
      source.token,
      source.qr_token,
      source.signed_token,
      source.qr_payload,
      nested.token,
      nested.payload
    ),
    passId: pick(source.pass_id, source.passId, source.jti, nested.pass_id, nested.jti),
    expiresAt: pick(source.expires_at, source.expiresAt, nested.expires_at),
    scope: pick(source.scope, nested.scope),
  }
}

const DECISIONS = {
  VALID: 'valid',
  ACCEPTED: 'valid',
  ALLOWED: 'valid',
  OK: 'valid',
  DUPLICATE: 'duplicate',
  ALREADY_CHECKED_IN: 'duplicate',
  ALREADY_MARKED: 'duplicate',
  EXPIRED: 'expired',
  WRONG_SCOPE: 'wrong-scope',
  WRONG_EVENT: 'wrong-scope',
  WRONG_CHECKPOINT: 'wrong-scope',
  INVALID: 'invalid',
  INVALID_SIGNATURE: 'invalid',
  REJECTED: 'invalid',
  REVOKED: 'invalid',
}

/** `/qr/verify` → one decision the result panel can render unambiguously. */
export function normalizeVerifyResponse(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const rawDecision = String(
    pick(source.decision, source.result, source.status, source.outcome) ?? ''
  ).toUpperCase()
  const decision = DECISIONS[rawDecision] ?? 'invalid'
  return {
    decision,
    participant: normalizeParticipant(source.participant),
    reason: pick(source.reason, source.message, source.detail),
    scope: pick(source.scope),
    session: pick(source.session, source.session_name),
  }
}

/* --------------------------------------------------------------- requests */

export async function matchFace(imageBlob) {
  const formData = new FormData()
  formData.append('photo', imageBlob, 'capture.jpg')
  const res = await client.post('/attendance/face-match', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return normalizeMatchResponse(res.data)
}

export async function markArrival({
  participantId,
  clientEventId,
  stationId,
  deskId,
  method,
  similarity,
  reason,
  clientMarkedAt,
}) {
  const res = await client.post('/arrivals', {
    participant_id: participantId,
    client_event_id: clientEventId,
    station_id: stationId,
    desk_id: deskId,
    method,
    similarity: similarity ?? null,
    reason: reason || null,
    client_marked_at: clientMarkedAt ?? new Date().toISOString(),
  })
  return res.data
}

export async function issuePass({
  participantId,
  clientEventId,
  stationId,
  deskId,
  scope = 'ENTRY',
}) {
  const res = await client.post('/qr/issue', {
    participant_id: participantId,
    client_event_id: clientEventId,
    station_id: stationId,
    desk_id: deskId,
    scope,
  })
  return normalizeIssuedPass(res.data)
}

export async function verifyPass({
  token,
  scope,
  sessionId,
  stationId,
  deskId,
  clientEventId,
}) {
  const res = await client.post('/qr/verify', {
    token,
    scope,
    session_id: sessionId ?? null,
    station_id: stationId,
    desk_id: deskId,
    client_event_id: clientEventId,
  })
  return normalizeVerifyResponse(res.data)
}

/**
 * Verify the QR *shape* only. A signed token is two base64url segments; the
 * client never reads the payload to grant access. Anything else is unsigned
 * JSON and is refused without a network call (§7.6 rules).
 */
export function looksLikeSignedToken(value) {
  const text = String(value ?? '').trim()
  const parts = text.split('.')
  if (parts.length !== 2) return false
  return parts.every((part) => /^[A-Za-z0-9_-]{8,}$/.test(part))
}

/**
 * Drain the outbox in order. Stops at the first network failure (the hub is
 * still unreachable); marks endpoint-missing items as waiting for the backend
 * instead of retrying forever.
 */
export async function drainOutbox() {
  const items = readQueue()
  const summary = { processed: 0, waiting: 0, failed: 0, pending: items.length }

  for (const item of items) {
    const attempts = (item.attempts ?? 0) + 1
    try {
      if (item.kind === 'SCAN') {
        await verifyPass({
          token: item.token,
          scope: item.scope,
          sessionId: item.sessionId,
          stationId: item.station,
          deskId: item.desk,
          clientEventId: item.id,
        })
      } else {
        await markArrival({
          participantId: item.participant?.id,
          clientEventId: item.id,
          stationId: item.station,
          deskId: item.desk,
          method: item.method,
          similarity: item.confidence,
          reason: item.reason,
          clientMarkedAt: item.createdAt,
        })
        await issuePass({
          participantId: item.participant?.id,
          clientEventId: item.id,
          stationId: item.station,
          deskId: item.desk,
          scope: item.scope ?? 'ENTRY',
        })
      }
      removeQueueItem(item.id)
      summary.processed += 1
      summary.pending = Math.max(0, summary.pending - 1)
    } catch (error) {
      if (isOffline(error)) {
        updateQueueItem(item.id, { attempts })
        summary.failed += 1
        break
      }
      if (isEndpointMissing(error)) {
        updateQueueItem(item.id, {
          attempts,
          status: 'waiting',
          lastError: 'Waiting for backend',
        })
        summary.waiting += 1
        continue
      }
      updateQueueItem(item.id, {
        attempts,
        status: 'failed',
        lastError: normalizeError(error).message,
      })
      summary.failed += 1
    }
  }

  summary.pending = readQueue().length
  return summary
}

export default {
  matchFace,
  markArrival,
  issuePass,
  verifyPass,
  drainOutbox,
  looksLikeSignedToken,
}
