import { useTicket } from './useTicket'
import { resolveStatus } from '../lib/statusMatrix'

/**
 * useRegistrationStatus — §7.3: the status screen on top of the shared
 * ticket lookup. The signed link (`?token=`) is the only access path until
 * the email/reference fallback exists (§14.1 #4).
 *
 * Returns the useTicket state plus:
 *   status — normalized registration status key
 *   view   — the matrix entry (heading/pill/stepper/actions) for it
 */
export function useRegistrationStatus(token) {
  const ticket = useTicket(token)
  const status = ticket.data?.registrationStatus ?? null
  const view = status ? resolveStatus(status) : null
  return { ...ticket, status, view }
}

export default useRegistrationStatus
