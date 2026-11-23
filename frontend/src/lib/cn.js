import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * One class helper for the whole app: conditional classes with
 * predictable Tailwind overrides (later variants win).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export default cn
