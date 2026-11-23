import { useEffect, useState } from 'react'
import { readQueue, subscribe } from '../lib/outbox'

/**
 * useSyncQueue — one source for the offline pill, the recent-arrivals note and
 * the queue page (§7.5 "Offline — 3 pending"). `online` reflects the browser's
 * connectivity signal; it is a hint, not a guarantee, so failed writes still
 * fall back to the outbox.
 */
export function useSyncQueue() {
  const [queue, setQueue] = useState(readQueue)
  const [online, setOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine !== false
  )

  useEffect(() => {
    const sync = () => setQueue(readQueue())
    const unsubscribe = subscribe(sync)
    const onOnline = () => {
      setOnline(true)
      sync()
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      unsubscribe()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return {
    queue,
    pending: queue.length,
    online,
    offline: !online,
    waiting: queue.filter((item) => item.status === 'waiting').length,
    failed: queue.filter((item) => item.status === 'failed').length,
  }
}

export default useSyncQueue
