/**
 * ticketCache — offline copy of the last successful pass lookup (§7.4).
 *
 * Keyed by the token being viewed, so a cached pass can only ever render for
 * that exact link; sessionStorage is per-tab and nothing is written for a
 * failed lookup. Never cache someone else's token.
 */

const PREFIX = 'ais26.ticket.'

export function readTicketCache(token) {
  if (!token) return null
  try {
    const raw = sessionStorage.getItem(PREFIX + token)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.data || parsed.token !== token) return null
    return parsed // { token, data, cachedAt }
  } catch {
    return null
  }
}

export function writeTicketCache(token, data) {
  if (!token || !data) return
  try {
    sessionStorage.setItem(
      PREFIX + token,
      JSON.stringify({ token, data, cachedAt: new Date().toISOString() })
    )
  } catch {
    // Private mode / quota — the offline copy is best-effort.
  }
}

export function clearTicketCache(token) {
  if (!token) return
  try {
    sessionStorage.removeItem(PREFIX + token)
  } catch {
    /* ignore */
  }
}
