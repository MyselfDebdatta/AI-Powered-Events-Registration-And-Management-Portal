/**
 * HeroBackdrop — layered, theme-consistent hero atmosphere.
 *
 * Layers (back to front):
 *  1. A warm temple-at-sunrise image (golden, theme-matched) positioned right,
 *     with the left kept clean for the headline
 *  2. A soft ivory fade over the image so it blends into the page without a
 *     hard photographic edge — the chakra detail stays gently visible
 *  3. Golden sparkles passed in as children
 *
 * All tints are GeekAI ink / gold / sand; no new hue is introduced.
 */

export function IvoryFade() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="ga-image-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F6F1E7" stopOpacity="0.95" />
          <stop offset="18%" stopColor="#F6F1E7" stopOpacity="0.66" />
          <stop offset="40%" stopColor="#F6F1E7" stopOpacity="0.10" />
          <stop offset="62%" stopColor="#F6F1E7" stopOpacity="0" />
          <stop offset="100%" stopColor="#F6F1E7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#ga-image-fade)" />
    </svg>
  )
}

export default function HeroBackdrop({ children }) {
  return (
    <>
      {/* Base ivory */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #F6F1E7 0%, #F0E9DA 60%, #ECE3D2 100%)' }}
      />

      {/* Theme image — temple at sunrise, anchored right; chakra gently visible */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:bg-right-center"
        style={{
          backgroundImage: 'url(/hero-temple.webp)',
          opacity: 0.95,
        }}
      />

      {/* Ivory fade protects headline contrast */}
      <IvoryFade />

      {children}
    </>
  )
}
