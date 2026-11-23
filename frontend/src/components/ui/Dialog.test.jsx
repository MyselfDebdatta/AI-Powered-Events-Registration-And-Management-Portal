import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dialog from './Dialog'

describe('Dialog', () => {
  it('exposes dialog semantics with a labelled title', () => {
    render(
      <Dialog open onClose={() => {}} title="Void pass">
        Body
      </Dialog>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Void pass' })).toBeTruthy()
  })

  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onClose={() => {}} title="Hidden">
        Body
      </Dialog>
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Confirm">
        Body
      </Dialog>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has an accessible close control', () => {
    render(
      <Dialog open onClose={() => {}} title="Confirm">
        Body
      </Dialog>
    )
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeTruthy()
  })
})
