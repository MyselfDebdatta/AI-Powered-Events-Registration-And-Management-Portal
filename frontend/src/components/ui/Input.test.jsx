import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Input from './Input'

describe('Input', () => {
  it('associates its label with the field', () => {
    render(<Input label="Email" />)
    const input = screen.getByLabelText('Email')
    expect(input.tagName).toBe('INPUT')
  })

  it('marks invalid fields and links the error message', () => {
    render(<Input label="Email" error="Enter a valid email" />)
    const input = screen.getByLabelText(/Email/)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy).textContent).toContain(
      'Enter a valid email'
    )
  })

  it('links helper text via aria-describedby', () => {
    render(<Input label="Phone" helper="Indian or international" />)
    const input = screen.getByLabelText('Phone')
    const describedBy = input.getAttribute('aria-describedby')
    expect(document.getElementById(describedBy).textContent).toContain(
      'Indian or international'
    )
  })
})
