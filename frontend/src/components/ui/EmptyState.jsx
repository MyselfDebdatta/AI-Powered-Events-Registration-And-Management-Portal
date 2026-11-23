import { cn } from '../../lib/cn'

/**
 * EmptyState — icon + one sentence + one action; explains what will appear
 * and what to do next (§5.9, §7.9).
 */
export function EmptyState({ icon: Icon, title, body, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-md border border-dashed',
        'border-border-strong bg-surface px-6 py-12 text-center',
        className
      )}
    >
      {Icon && <Icon className="h-8 w-8 text-text-muted" aria-hidden="true" />}
      <h3 className="text-h3 font-semibold text-text">{title}</h3>
      {body && (
        <p className="max-w-prose text-sm text-text-muted">{body}</p>
      )}
      {action}
    </div>
  )
}

export default EmptyState
