import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins conditional classes', () => {
    const enabled = false
    expect(cn('a', enabled && 'b', 'c')).toBe('a c')
  })

  it('later Tailwind variants win', () => {
    expect(cn('bg-paper', 'bg-ink-900')).toBe('bg-ink-900')
  })

  it('keeps non-conflicting classes', () => {
    expect(cn('px-4 text-sm', 'py-2')).toBe('px-4 text-sm py-2')
  })

  it('handles objects and arrays', () => {
    expect(cn(['a', { b: true, c: false }])).toBe('a b')
  })
})
