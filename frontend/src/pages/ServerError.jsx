import { Link, useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { event } from '../content/event'
import Button from '../components/ui/Button'

/**
 * ServerError — 500: keeps the page recoverable with retry, request id and
 * a way home (§7.9).
 */
export function ServerError() {
  const [searchParams] = useSearchParams()
  const requestId = searchParams.get('request_id')

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-lg rounded-md border border-border bg-paper p-8 text-center shadow-lg">
        <p className="font-mono text-sm text-text-muted">500</p>
        <h1 className="mt-1 text-h3 text-text">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-prose text-sm text-text-muted">
          That wasn't your fault. Try again, and if it keeps happening, send the
          request id below to the team.
        </p>
        {requestId && (
          <p className="mt-3 font-mono text-xs text-text-muted">
            Request id: <span className="text-text">{requestId}</span>
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-sm border border-border-control px-5 text-sm font-medium text-ink-900 transition-colors duration-fast hover:bg-sand-100"
          >
            Go home
          </Link>
        </div>
        {event.contact.email && (
          <p className="mt-4 text-xs text-text-muted">
            <a className="underline" href={`mailto:${event.contact.email}`}>
              {event.contact.label}
            </a>
          </p>
        )}
      </div>
    </main>
  )
}

export default ServerError
