import { Info, CheckCircle2, AlertTriangle, XOctagon, WifiOff } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Banner — persistent status strip (info/success/warning/error/offline).
 * It stays until the condition resolves; toasts are never the only surface
 * for a failure (§5.2, §7.9).
 */
const tones = {
  info: {
    className: 'border-border-strong bg-ivory-50 text-ink-900',
    icon: Info,
    role: 'status',
  },
  success: {
    className: 'border-teal-500/30 bg-teal-100 text-teal-600',
    icon: CheckCircle2,
    role: 'status',
  },
  warning: {
    className: 'border-amber-600/30 bg-amber-100 text-amber-600',
    icon: AlertTriangle,
    role: 'status',
  },
  error: {
    className: 'border-red-600/30 bg-red-100 text-red-600',
    icon: XOctagon,
    role: 'alert',
  },
  offline: {
    className: 'border-sand-300 bg-sand-100 text-slate-700',
    icon: WifiOff,
    role: 'status',
  },
}

export function Banner({ tone = 'info', title, children, action, className, ...props }) {
  const config = tones[tone] ?? tones.info
  const Icon = config.icon
  return (
    <div
      role={config.role}
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-md border px-4 py-3 text-sm',
        config.className,
        className
      )}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
      {action}
    </div>
  )
}

export default Banner
