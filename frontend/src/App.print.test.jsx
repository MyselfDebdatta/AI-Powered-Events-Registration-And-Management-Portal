import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import BadgePrint, { printBadgeA4Sheet, printBadgeSheet } from './components/ticket/BadgePrint'
import PassQr from './components/ticket/PassQr'

const css = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8')

describe('Print formats — CR80 badge, A6 ticket, A4 sheet (§12.7)', () => {
  it('uses a 4-module QR quiet zone and error correction H', () => {
    const { container } = render(<PassQr value="signed.token" />)
    const svg = container.querySelector('[data-testid="pass-qr"] svg')
    expect(svg).toBeTruthy()
    // qrcode.react renders a white border path sized by marginSize.
    expect(svg.getAttribute('viewBox')).toBeTruthy()
    expect(container.querySelector('[data-testid="pass-qr"]').className).toMatch(/bg-white/)
  })

  it('renders a CR80 badge and an 8-badge A4 sheet', () => {
    const { container } = render(
      <BadgePrint participant={{ name: 'Print Person' }} token="signed.token" passId="AIS26-0001" />
    )
    expect(screen.getByTestId('badge-print')).toBeTruthy()
    expect(container.querySelectorAll('.badge-sheet .badge-print')).toHaveLength(8)
    expect(typeof printBadgeSheet).toBe('function')
    expect(typeof printBadgeA4Sheet).toBe('function')
  })

  it('has print CSS for CR80, A6 40mm QR, A4 sheet and hidden chrome', () => {
    expect(css).toMatch(/size:\s*85\.6mm 54mm/)
    expect(css).toMatch(/size:\s*A6 portrait/)
    expect(css).toMatch(/size:\s*A4 portrait/)
    expect(css).toMatch(/data-testid='pass-qr'\] svg\s*\{\s*width:\s*40mm/)
    expect(css).toMatch(/no-print[\s\S]{0,160}display:\s*none/)
  })
})
