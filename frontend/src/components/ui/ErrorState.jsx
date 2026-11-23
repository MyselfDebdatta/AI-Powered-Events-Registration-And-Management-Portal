import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from './Button'
import { cn } from '../../lib/cn'

/**
 * ErrorState — recoverable error panel with retry, optional request id and
 * no white screen (§5.9, §7.9).
 */
export function ErrorState({
  title = "We couldn't load this.",
  body = 'Try again in a moment. If it keeps failing, contact the team with the request id below.',
  requestId,
  retry,
  retryLabel = 'Try again',
  className,
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-md border',
        'border-red-600/30 bg-red-100 px-6 py-10 text-center',
        className
      )}
    >
      <AlertTriangle className="h-8 w-8 text-status-danger" aria-hidden="true" />
      <h3 className="text-h3 font-semibold text-text">{title}</h3>
      <p className="max-w-prose text-sm text-text-muted">{body}</p>
      {requestId && (
        <p className="font-mono text-xs text-text-muted">
          Request id: <span className="text-text">{requestId}</span>
        </p>
      )}
      {retry && (
        <Button variant="primary" onClick={retry} className="mt-1">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export default ErrorState
