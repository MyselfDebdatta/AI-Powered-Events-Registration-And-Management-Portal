/**
 * outbox — the station's local pending queue (§7.5 offline states,
 * WorkFlow.md Appendix C.2).
 *
 * The queue is deliberately small and non-biometric: it stores the decision
 * the volunteer already made (participant, station, scope, timestamps) and a
 * `client_event_id` that is reused on every retry. Photos never leave the
 * camera, and nothing is removed until the hub confirms it.
 */

const QUEUE_KEY = 'geekai.volunteer.outbox.v1'
const RECENT_KEY = 'geekai.volunteer.recent.v1'
const SCAN_RECENT_KEY = 'geekai.volunteer.scan-recent.v1'

const listeners = new Set()
let storageBound = false

function safeParse(raw, fallback) {
  try {
    const value = JSON.parse(raw)
    return value ?? fallback
  } catch {
    return fallback
  }
}

function readJson(key, fallback) {
  try {
    return safeParse(localStorage.getItem(key), fallback)
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota/private-mode: callers still see the in-memory change */
  }
  notify()
}

function notify() {
  listeners.forEach((listener) => listener())
}

function bindStorage() {
  if (storageBound || typeof window === 'undefined') return
  storageBound = true
  window.addEventListener('storage', (event) => {
    if (!event.key || event.key.startsWith('geekai.volunteer.')) notify()
  })
}

export function newClientEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/* ------------------------------------------------------------------ queue */

export function readQueue() {
  const items = readJson(QUEUE_KEY, [])
  return Array.isArray(items) ? items : []
}

export function queueCount() {
  return readQueue().length
}

/**
 * enqueue({ kind, participant, token, scope, sessionId, desk, station,
 *           confidence, reason, createdAt })
 * Returns the stored item. Existing items with the same `id` are replaced so a
 * retry never duplicates a record.
 */
export function enqueue(item) {
  bindStorage()
  const entry = {
    id: item.id ?? newClientEventId(),
    kind: item.kind ?? 'ARRIVAL',
    status: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: item.createdAt ?? new Date().toISOString(),
    ...item,
  }
  const queue = readQueue().filter((existing) => existing.id !== entry.id)
  writeJson(QUEUE_KEY, [entry, ...queue].slice(0, 50))
  return entry
}

export function updateQueueItem(id, patch) {
  const queue = readQueue().map((item) =>
    item.id === id ? { ...item, ...patch } : item
  )
  writeJson(QUEUE_KEY, queue)
}

export function removeQueueItem(id) {
  writeJson(
    QUEUE_KEY,
    readQueue().filter((item) => item.id !== id)
  )
}

export function clearQueue() {
  writeJson(QUEUE_KEY, [])
}

export function subscribe(listener) {
  bindStorage()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/* ---------------------------------------------------------------- recents */

/**
 * Recent desk activity is a display convenience only. It is session-scoped
 * and never used to decide whether a pass was issued or an entry recorded.
 */
export function addRecent(entry) {
  const recent = readJson(RECENT_KEY, [])
  const next = [
    { id: newClientEventId(), at: new Date().toISOString(), ...entry },
    ...(Array.isArray(recent) ? recent : []),
  ].slice(0, 12)
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  notify()
}

export function readRecent() {
  const recent = readJson(RECENT_KEY, [])
  return Array.isArray(recent) ? recent : []
}

export function addRecentScan(entry) {
  const recent = readJson(SCAN_RECENT_KEY, [])
  const next = [
    { id: newClientEventId(), at: new Date().toISOString(), ...entry },
    ...(Array.isArray(recent) ? recent : []),
  ].slice(0, 5)
  try {
    sessionStorage.setItem(SCAN_RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function readRecentScans() {
  const recent = readJson(SCAN_RECENT_KEY, [])
  return Array.isArray(recent) ? recent.slice(0, 5) : []
}

export default {
  readQueue,
  queueCount,
  enqueue,
  updateQueueItem,
  removeQueueItem,
  clearQueue,
  subscribe,
  addRecent,
  readRecent,
  addRecentScan,
  readRecentScans,
  newClientEventId,
}
