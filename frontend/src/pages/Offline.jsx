import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import Banner from '../components/ui/Banner'
import Button from '../components/ui/Button'

/**
 * Offline — connection help with a live online/offline status and a retry
 * check; never claims "live" without a state (§7.9).
 */
export function Offline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [checkedAt, setCheckedAt] = useState(() => new Date())

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const recheck = () => {
    setOnline(navigator.onLine)
    setCheckedAt(new Date())
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-lg rounded-md border border-border bg-paper p-8 shadow-lg">
        <div className="flex items-start gap-3">
          {online ? (
            <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-status-success" aria-hidden="true" />
          ) : (
            <WifiOff className="mt-0.5 h-8 w-8 shrink-0 text-status-pending" aria-hidden="true" />
          )}
          <div>
            <h1 className="text-h3 text-text">
              {online ? "You're back online" : "You're offline"}
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              {online
                ? 'Your connection was restored. Continue where you left off.'
                : 'This page needs a connection. If you were at the arrival desk, work continues on the local hub and syncs automatically when the connection returns.'}
            </p>
          </div>
        </div>

        <Banner tone={online ? 'success' : 'offline'} className="mt-5">
          {online ? 'Connection restored.' : 'Working offline. Saved work will sync automatically.'}
          <span className="ml-1 text-text-muted">
            Checked {checkedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.
          </span>
        </Banner>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={recheck}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Check again
          </Button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center rounded-sm border border-border-control px-5 text-sm font-medium text-ink-900 transition-colors duration-fast hover:bg-sand-100"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  )
}

export default Offline
