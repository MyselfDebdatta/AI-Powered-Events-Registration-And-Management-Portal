import { useCallback, useEffect, useState } from 'react'
import client, { normalizeError } from '../api/client'
import { normalizeTicketResponse, DEMO_TOKENS, isDemoToken } from '../lib/ticketContract'
import { readTicketCache, writeTicketCache } from '../lib/ticketCache'

/**
 * useTicket — loads `GET /api/tickets/{token}` (WorkFlow.md §9.1) for the
 * participant status and ticket screens (§7.3/§7.4).
 *
 * Phases: idle (no token) | loading | ready | notfound | expired | error.
 * `fromCache: true` means the shown payload is the offline copy from
 * sessionStorage, with `checkedAt` set to when it was originally fetched.
 * `demo: true` means the payload is the labelled sample behind a `demo`
 * token — no request is made and nothing is cached.
 */
export function useTicket(token) {
  const [state, setState] = useState(() => ({
    phase: token ? 'loading' : 'idle',
    data: null,
    error: null,
    fromCache: false,
    demo: false,
    checkedAt: null,
  }))
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!token) {
      setState({ phase: 'idle', data: null, error: null, fromCache: false, demo: false, checkedAt: null })
      return undefined
    }

    let cancelled = false

    async function load() {
      if (isDemoToken(token)) {
        setState({
          phase: 'ready',
          data: normalizeTicketResponse(DEMO_TOKENS[token], token),
          error: null,
          fromCache: false,
          demo: true,
          checkedAt: new Date(),
        })
        return
      }

      setState((prev) => ({ ...prev, phase: 'loading', error: null }))
      try {
        const res = await client.get(`/tickets/${encodeURIComponent(token)}`)
        if (cancelled) return
        writeTicketCache(token, res.data)
        setState({
          phase: 'ready',
          data: normalizeTicketResponse(res.data, token),
          error: null,
          fromCache: false,
          demo: false,
          checkedAt: new Date(),
        })
      } catch (err) {
        if (cancelled) return
        const error = normalizeError(err)
        if (error.status === 404) {
          setState({ phase: 'notfound', data: null, error, fromCache: false, demo: false, checkedAt: new Date() })
          return
        }
        if (error.status === 410) {
          setState({ phase: 'expired', data: null, error, fromCache: false, demo: false, checkedAt: new Date() })
          return
        }
        // Network/server trouble: fall back to this token's offline copy (§7.4).
        const cached = readTicketCache(token)
        if (cached) {
          setState({
            phase: 'ready',
            data: normalizeTicketResponse(cached.data, token),
            error,
            fromCache: true,
            demo: false,
            checkedAt: new Date(cached.cachedAt),
          })
        } else {
          setState({ phase: 'error', data: null, error, fromCache: false, demo: false, checkedAt: null })
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token, nonce])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  return { ...state, refresh }
}

export default useTicket
