import { useCallback, useEffect, useState } from 'react'

/**
 * Desk/station context for the volunteer shell (§7.5 layout).
 *
 * A desk selection is local to the browser: event-day stations are dedicated
 * devices, so the choice survives a reload but never becomes shared state.
 * `station` is the stable identifier written to audit records; `label` is the
 * human-facing "Desk 02".
 */

export const DESKS = [
  { id: 'desk-01', label: 'Desk 01', station: 'ST-01' },
  { id: 'desk-02', label: 'Desk 02', station: 'ST-02' },
  { id: 'desk-03', label: 'Desk 03', station: 'ST-03' },
  { id: 'desk-04', label: 'Desk 04', station: 'ST-04' },
]

const STORAGE_KEY = 'geekai.volunteer.desk'
const EVENT = 'geekai:desk-change'
const DEFAULT_DESK = DESKS[0].id

function isDeskId(value) {
  return DESKS.some((desk) => desk.id === value)
}

export function readDeskId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isDeskId(stored)) return stored
  } catch {
    /* storage unavailable — fall through to default */
  }
  return DEFAULT_DESK
}

export function getDesk(deskId = readDeskId()) {
  return DESKS.find((desk) => desk.id === deskId) ?? DESKS[0]
}

export function writeDeskId(deskId) {
  if (!isDeskId(deskId)) return
  try {
    localStorage.setItem(STORAGE_KEY, deskId)
  } catch {
    /* ignore quota/security errors */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: deskId }))
}

export function useDesk() {
  const [deskId, setDeskId] = useState(readDeskId)

  useEffect(() => {
    const sync = () => setDeskId(readDeskId())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setDesk = useCallback((next) => {
    writeDeskId(next)
    setDeskId(isDeskId(next) ? next : DEFAULT_DESK)
  }, [])

  return { deskId, desk: getDesk(deskId), desks: DESKS, setDesk }
}

export default useDesk
