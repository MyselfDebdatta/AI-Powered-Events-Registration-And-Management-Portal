import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import client from './api/client'
import flags from './content/flags'

/**
 * Stage 5 — copy freeze (§12.1). Every route is scanned for forbidden claims:
 * no QR emailed before arrival, no invented numbers or unsupported statements.
 */
vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: { ...actual.default, get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  }
})

const ROUTES = [
  '/', '/venue', '/faq', '/register',
  '/registration/status', '/registration/status?token=demo', '/registration/status?token=demo-pass',
  '/ticket/demo', '/ticket/demo-pass', '/privacy', '/accessibility', '/code-of-conduct',
  '/volunteer/dashboard', '/volunteer/arrival', '/volunteer/scan',
  '/volunteer/manual?mode=entry', '/volunteer/queue', '/volunteer/help',
  '/admin/dashboard', '/admin/participants', '/admin/sessions', '/admin/attendance',
  '/admin/volunteers', '/admin/reconciliation', '/admin/audit', '/admin/settings', '/admin/export',
  '/403', '/500', '/offline', '/no-such-page',
]

const FORBIDDEN = [
  /your (qr )?(code|pass) (has been |was )(emailed|sent)/i,
  /qr (code|pass)?\s*(was|has been)\s*(emailed|sent)/i,
  /sent to your (email|inbox)/i,
  /check your inbox/i,
  /qr[^.]{0,40}emailed/i,
  /registration is free/i,
  /100% free/i,
  /guaranteed (entry|seat|admission)/i,
]

function renderAt(path) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('token', 'copy-token')
  localStorage.setItem('user', JSON.stringify({ role: 'ADMIN', name: 'Copy Reviewer' }))
  client.get.mockReset()
  client.get.mockImplementation((url) => {
    if (url === '/admin/dashboard') {
      return Promise.resolve({
        data: { total_participants: 0, total_sessions: 0, total_attendance_records: 0, event_checkins: 0, participants_by_category: {}, recent_registrations: [] },
      })
    }
    if (url.startsWith('/participants/')) return Promise.resolve({ data: { id: 1, name: 'Test Person', category: 'STUDENT' } })
    if (url === '/participants/') return Promise.resolve({ data: { total: 0, items: [] } })
    return Promise.resolve({ data: [] })
  })
})

afterEach(() => {
  cleanup()
  flags.arrivalV2 = false
  flags.scanV2 = false
  localStorage.clear()
})

describe('Content truth / copy freeze (§12.1)', () => {
  for (const path of ROUTES) {
    it(`${path} contains no forbidden claims`, async () => {
      renderAt(path)
      // Allow lazy chunks + effects to settle without relying on network.
      await Promise.resolve()
      const text = document.body.textContent ?? ''
      for (const pattern of FORBIDDEN) {
        expect(`${path}: ${text.match(pattern)?.[0]}`, `forbidden copy on ${path}`).toBe(`${path}: undefined`)
      }
    })
  }

  it('permits truthful in-site registration copy while blocking false claims', async () => {
    renderAt('/register')
    await screen.findByRole('heading', { name: /Your details/i })
    const text = document.body.textContent ?? ''
    // Truthful copy is explicitly allowed; unsupported claims remain blocked.
    expect(text).toMatch(/pass is issued at the arrival desk/i)
    expect(text).toMatch(/no qr code is sent by email/i)
    for (const pattern of FORBIDDEN) {
      expect(text).not.toMatch(pattern)
    }
  })

  it('labels unconfirmed event facts explicitly', async () => {
    renderAt('/')
    await import('@testing-library/react').then(({ screen, waitFor }) =>
      waitFor(() => expect(screen.getAllByText(/date to be announced/i).length).toBeGreaterThan(0))
    )
  })
})
