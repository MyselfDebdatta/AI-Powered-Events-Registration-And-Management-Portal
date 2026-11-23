import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * SyncStatus — the offline pill and the queue note (§7.5 states).
 * "Offline — 3 pending" is a count of saved records, never a success claim:
 * the copy says the records are saved locally and will sync.
 */
export function SyncStatus({
  pending = 0,
  online = true,
  variant = 'pill',
  onRetry,
  retrying = false,
  className,
}) {
  const offline = !online
  const label = offline
    ? pending > 0
      ? `Offline — ${pending} pending`
      : 'Offline'
    : pending > 0
      ? `${pending} pending sync`
      : 'Online'

  if (variant === 'bar') {
    if (!offline && pending === 0) return null
    return (
      <div
        role="status"
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-t border-amber-600/20 bg-amber-100 px-3.5 py-2 text-[12px] text-amber-600',
          className
        )}
      >
        <span className="flex items-center gap-2 font-semibold">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          {offline
            ? `Offline — capture is saved locally. ${pending} pending sync.`
            : `${pending} record${pending === 1 ? '' : 's'} saved on this device · pending sync.`}
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying || offline}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-sm px-2 font-semibold underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', retrying && 'animate-spin')} aria-hidden="true" />
            {retrying ? 'Retrying…' : 'Retry now'}
          </button>
        )}
      </div>
    )
  }

  const Icon = offline ? WifiOff : Wifi

  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold',
        offline ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-600',
        className
      )}
      title={offline ? 'Records are saved on this device' : 'Connected to the hub'}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      {onRetry && offline && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          aria-label="Retry sync"
          className="ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-amber-600/15 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3 w-3', retrying && 'animate-spin')} aria-hidden="true" />
        </button>
      )}
    </span>
  )
}

export default SyncStatus
