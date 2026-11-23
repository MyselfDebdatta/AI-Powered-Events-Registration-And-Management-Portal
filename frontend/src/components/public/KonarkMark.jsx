import { cn } from '../../lib/cn'

/**
 * KonarkMark — line-art wheel used as the brand mark (§4.10). Decorative by
 * default; pass `title` to expose it as an image with an accessible name.
 * `strokeWidth` is in viewBox units, so size it per context (≈1.6 for small
 * marks, ≈0.9 for the large hero wheel).
 */
export function KonarkMark({ className, title, strokeWidth = 1.6, ...props }) {
  const decorative = !title
  const spokes = [0, 90, 180, 270]
  const diagonals = [45, 135, 225, 315]

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : title}
      className={cn('block', className)}
      {...props}
    >
      {/* Rims and hub */}
      <circle cx="24" cy="24" r="21.4" />
      <circle cx="24" cy="24" r="16.8" />
      <circle cx="24" cy="24" r="6.2" />

      {/* Hub flower */}
      <g strokeWidth={strokeWidth * 0.8}>
        <line x1="24" y1="19.6" x2="24" y2="28.4" />
        <line x1="19.6" y1="24" x2="28.4" y2="24" />
        <line x1="20.9" y1="20.9" x2="27.1" y2="27.1" />
        <line x1="27.1" y1="20.9" x2="20.9" y2="27.1" />
      </g>

      {/* Cardinal spokes — tapered petals, wide at the hub */}
      <g stroke="none" fill="currentColor">
        {spokes.map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg} 24 24)`}
            d="M24 7.4 C25.5 11.5 26.2 14.6 26.2 17.8 L21.8 17.8 C21.8 14.6 22.5 11.5 24 7.4 Z"
          />
        ))}
      </g>

      {/* Diagonal spokes with rim ticks */}
      {diagonals.map((deg) => (
        <g key={deg} transform={`rotate(${deg} 24 24)`}>
          <line x1="24" y1="17.6" x2="24" y2="7.4" />
          <line x1="24" y1="6.8" x2="24" y2="3.2" />
        </g>
      ))}
    </svg>
  )
}

export default KonarkMark
