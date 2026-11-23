import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Button from './Button'

describe('Button', () => {
  it('renders its label and is a button', () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.tagName).toBe('BUTTON')
    expect(button.type).toBe('button')
  })

  it('keeps width and announces aria-busy while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.disabled).toBe(true)
    // label stays in the DOM (invisible) so the width does not collapse
    expect(button.textContent).toContain('Save')
  })

  it('is disabled when disabled', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button').disabled).toBe(true)
  })

  it('forwards native props such as type and onClick', () => {
    let clicked = false
    render(
      <Button type="submit" onClick={() => (clicked = true)}>
        Go
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button.type).toBe('submit')
    button.click()
    expect(clicked).toBe(true)
  })
})
