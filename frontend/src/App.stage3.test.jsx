import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import client from './api/client'
import { normalizeTicketResponse, isDemoToken } from './lib/ticketContract'

/**
 * Stage 3 — participant status + ticket (FrontendPlanning.md §7.3/§7.4).
 * The ticket endpoint (WorkFlow.md §9.1) does not exist yet, so the API is
 * mocked here and the `demo` tokens are asserted to never hit the network.
 */
vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: { ...actual.default, get: vi.fn() },
  }
})

function renderAt(path) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
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

/** Every participant screen must avoid the forbidden "QR emailed" claims. */
function expectNoQrEmailedClaim() {
  const text = document.body.textContent ?? ''
  const forbidden = [
    /your (qr )?code has been sent/i,
    /qr (code )?(was|has been) (emailed|sent)/i,
    /sent to your (email|inbox)/i,
    /check your inbox/i,
    /qr[^.]{0,40}emailed/i,
  ]
  for (const pattern of forbidden) {
    expect(text).not.toMatch(pattern)
  }
}

function mockTicket(payload) {
  client.get.mockImplementation((url) => {
    if (url.startsWith('/tickets/')) return Promise.resolve({ data: payload })
    return Promise.reject(new Error(`unexpected GET ${url}`))
  })
}

function mockTicketFailure(error) {
  client.get.mockImplementation(() => Promise.reject(error))
}

/**
 * The status pill renders as a <span>; stepper state text renders as a
 * <div>, so filtering by tag finds the pill even when the labels repeat.
 */
function expectPill(label) {
  const spans = screen.getAllByText(label).filter((el) => el.tagName === 'SPAN')
  expect(spans.length).toBeGreaterThan(0)
}

beforeEach(() => {
  client.get.mockReset()
  sessionStorage.clear()
})

/* --------------------------------------------------- status state matrix */

describe('Stage 3 registration status — state matrix (§7.3)', () => {
  it('shows the interim no-link screen instead of a lookup that cannot work', async () => {
    renderAt('/registration/status')
    expect(await screen.findByRole('heading', { level: 1, name: /Check your registration status/i })).toBeTruthy()
    expect(screen.getByText(/No link, no lookup/i)).toBeTruthy()
    expect(screen.getByText(/Signed-link lookup only/i)).toBeTruthy()
    expect(client.get).not.toHaveBeenCalled()
    expectNoQrEmailedClaim()
  })

  it('renders the "in review" screen with pill, real stepper and actions', async () => {
    mockTicket({
      registration_status: 'IN_REVIEW',
      reference: 'AIS26-0042',
      email: 'participant@example.com',
      submitted_at: '2026-03-01T10:42:00Z',
    })
    renderAt('/registration/status?token=tok-review')

    expect(await screen.findByRole('heading', { level: 1, name: "You're in the queue." })).toBeTruthy()
    expectPill('In review')

    const stepper = screen.getByRole('list', { name: 'Registration progress' })
    const steps = within(stepper).getAllByRole('listitem')
    expect(steps).toHaveLength(3)
    expect(steps[0].textContent).toMatch(/Form received/)
    expect(steps[0].textContent).toMatch(/Done/)
    expect(steps[1].textContent).toMatch(/Verification/)
    expect(steps[1].textContent).toMatch(/In review/)
    expect(steps[2].textContent).toMatch(/QR pass/)
    expect(steps[2].textContent).toMatch(/Issued at arrival/)
    expect(steps[1].getAttribute('aria-current')).toBe('step')

    expect(screen.getByText('AIS26-0042')).toBeTruthy()
    expect(screen.getByText('participant@example.com')).toBeTruthy()
    expect(screen.getByText('What happens next')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Check status/i })).toBeTruthy()
    expect(screen.getByText(/Last checked/)).toBeTruthy()
    expect(screen.getByText(/used only for event registration and access/i)).toBeTruthy()
    expectNoQrEmailedClaim()

    // last successful response is cached for offline display (§7.4)
    expect(sessionStorage.getItem('ais26.ticket.tok-review')).toContain('AIS26-0042')
    // signed status links are not indexed
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')
  })

  it('renders "received", "waitlisted", "needs info", "rejected" and "cancelled"', async () => {
    const cases = [
      [{ registration_status: 'RECEIVED' }, /We've got your form\./, 'Received'],
      [{ registration_status: 'WAITLISTED' }, /You're on the waitlist\./, 'Waitlisted'],
      [{ registration_status: 'NEEDS_INFO' }, /We need one more detail\./, 'Action needed'],
      [{ registration_status: 'REJECTED' }, /We couldn't confirm this registration\./, 'Not confirmed'],
      [{ registration_status: 'CANCELLED' }, /This registration was cancelled\./, 'Cancelled'],
    ]

    for (const [payload, heading, pill] of cases) {
      sessionStorage.clear()
      client.get.mockReset()
      mockTicket(payload)
      const { unmount } = renderAt('/registration/status?token=tok-matrix')
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeTruthy()
      expectPill(pill)
      expectNoQrEmailedClaim()
      unmount()
    }
  })

  it('offers the matrix action for each state', async () => {
    mockTicket({ registration_status: 'CONFIRMED' })
    const first = renderAt('/registration/status?token=tok-confirmed')
    expect(await screen.findByRole('heading', { level: 1, name: /You're confirmed\./ })).toBeTruthy()
    const details = screen.getByRole('link', { name: /View event details/i })
    expect(details.getAttribute('href')).toBe('/venue')
    first.unmount()

    client.get.mockReset()
    mockTicket({ registration_status: 'NEEDS_INFO' })
    const second = renderAt('/registration/status?token=tok-needs')
    expect(await screen.findByRole('heading', { level: 1, name: /We need one more detail\./ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Open the form/i }).getAttribute('href')).toBe('/register')
    second.unmount()

    client.get.mockReset()
    mockTicket({ registration_status: 'CANCELLED' })
    const third = renderAt('/registration/status?token=tok-cancelled')
    expect(await screen.findByRole('heading', { level: 1, name: /This registration was cancelled\./ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Register again/i }).getAttribute('href')).toBe('/register')
    third.unmount()
  })

  it('opens an honest support note instead of a dead "Contact support" button', async () => {
    const user = userEvent.setup()
    mockTicket({ registration_status: 'WAITLISTED' })
    renderAt('/registration/status?token=tok-waitlist')

    const button = await screen.findByRole('button', { name: /Contact support/i })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    await user.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    const note = screen.getByRole('region', { name: /Contact support/i })
    expect(note.textContent).toMatch(/email address on your confirmation/i)
    expect(within(note).getByRole('link', { name: /Read the FAQ/i }).getAttribute('href')).toBe('/faq')
  })

  it('hides the stepper for not-found and expired links (§7.3)', async () => {
    mockTicketFailure({ response: { status: 404, data: {} } })
    const first = renderAt('/registration/status?token=tok-missing')
    expect(await screen.findByRole('heading', { level: 1, name: /couldn't find that registration/i })).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Registration progress' })).toBeNull()
    expect(screen.getByRole('button', { name: /Try again/i })).toBeTruthy()
    first.unmount()

    client.get.mockReset()
    mockTicketFailure({ response: { status: 410, data: {} } })
    const second = renderAt('/registration/status?token=tok-expired')
    expect(await screen.findByRole('heading', { level: 1, name: /link has expired/i })).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Registration progress' })).toBeNull()
    const lookup = screen.getByRole('button', { name: /Look up with email/i })
    expect(lookup).toHaveProperty('disabled', true) // fallback ships later (§14.1 #4)
    expectNoQrEmailedClaim()
    second.unmount()
  })

  it('shows a designed screen for an unrecognised status instead of inventing one', async () => {
    mockTicket({ registration_status: 'SOMETHING_NEW' })
    renderAt('/registration/status?token=tok-unknown')
    expect(await screen.findByRole('heading', { level: 1, name: /can't show this status yet/i })).toBeTruthy()
    expectNoQrEmailedClaim()
  })

  it('falls back to the offline copy when the network is gone (§7.4)', async () => {
    sessionStorage.setItem(
      'ais26.ticket.tok-offline',
      JSON.stringify({
        token: 'tok-offline',
        data: { registration_status: 'CONFIRMED', reference: 'AIS26-0009', email: 'cached@example.com' },
        cachedAt: '2026-03-01T10:00:00Z',
      })
    )
    mockTicketFailure({ request: {} }) // network error, no response
    renderAt('/registration/status?token=tok-offline')

    expect(await screen.findByRole('heading', { level: 1, name: /You're confirmed\./ })).toBeTruthy()
    expect(screen.getByText('Offline copy · may be out of date')).toBeTruthy()
    expect(screen.getByText('AIS26-0009')).toBeTruthy()
    expectNoQrEmailedClaim()
  })

  it('renders a retry panel (never a blank page) when the lookup fails with no cache', async () => {
    mockTicketFailure(new Error('boom'))
    renderAt('/registration/status?token=tok-error')
    expect(await screen.findByRole('heading', { level: 1, name: /couldn't check your registration/i })).toBeTruthy()
    const retry = screen.getByRole('button', { name: /Try again/i })
    const user = userEvent.setup()
    await user.click(retry)
    expect(
      await screen.findByRole('heading', { level: 1, name: /couldn't check your registration/i })
    ).toBeTruthy()
    expect(client.get).toHaveBeenCalledTimes(2)
  })

  it('serves the demo token without any network call, labelled as demo', async () => {
    renderAt('/registration/status?token=demo')
    expect(await screen.findByRole('heading', { level: 1, name: "You're in the queue." })).toBeTruthy()
    expect(client.get).not.toHaveBeenCalled()
    expect(screen.getByText(/Demo registration — sample data/i)).toBeTruthy()
    expectNoQrEmailedClaim()
  })
})

/* ------------------------------------------------------- ticket / pass */

describe('Stage 3 participant ticket (§7.4)', () => {
  it('renders the issued pass with QR, pass ID and sticky actions', async () => {
    mockTicket({
      ticket_status: 'ISSUED',
      name: 'Asha Rout',
      pass_id: 'AIS26-0042',
      scope: 'Entry · sessions',
    })
    renderAt('/ticket/tok-pass')

    expect(await screen.findByText('Asha Rout')).toBeTruthy()
    const qr = screen.getByTestId('pass-qr')
    expect(qr.querySelector('svg')).toBeTruthy() // level H, quiet zone (§7.4)
    expect(screen.getByTestId('pass-id').textContent).toBe('AIS26-0042')
    expect(screen.getByText('Valid for one entry')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Show pass/i })).toBeTruthy()
    expect(screen.getByText(/Have your photo ID ready/i)).toBeTruthy()
    // participant pass has its own app-bar shell — no public masthead/footer
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull()
    expect(document.body.textContent).not.toContain('Content in development')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')
    expectNoQrEmailedClaim()
  })

  it('replaces the QR with "Entry recorded" once the pass is used', async () => {
    mockTicket({ ticket_status: 'USED', name: 'Asha Rout', used_at: '2026-03-14T10:42:00Z' })
    renderAt('/ticket/tok-used')

    expect(await screen.findByTestId('qr-replaced')).toBeTruthy()
    expect(screen.queryByTestId('pass-qr')).toBeNull()
    // QR-slot label + status pill both read "Entry recorded"
    expect(screen.getAllByText('Entry recorded').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/Entry has been recorded for this pass/)).toBeTruthy()
    expectNoQrEmailedClaim()
  })

  it('never renders a scan target for expired or revoked passes', async () => {
    mockTicket({ ticket_status: 'EXPIRED' })
    const first = renderAt('/ticket/tok-expired')
    expect(await screen.findByTestId('qr-absent')).toBeTruthy()
    expect(screen.queryByTestId('pass-qr')).toBeNull()
    expect(screen.getByText(/can no longer be scanned/i)).toBeTruthy()
    first.unmount()

    client.get.mockReset()
    mockTicket({ ticket_status: 'REVOKED' })
    const second = renderAt('/ticket/tok-revoked')
    expect(await screen.findByTestId('qr-absent')).toBeTruthy()
    expect(screen.queryByTestId('pass-qr')).toBeNull()
    expect(screen.getByText(/Contact the desk or the host office/i)).toBeTruthy()
    expectNoQrEmailedClaim()
    second.unmount()
  })

  it('explains that a not-issued pass comes from the arrival desk', async () => {
    mockTicket({ ticket_status: 'NOT_ISSUED' })
    renderAt('/ticket/tok-not-issued')
    expect(await screen.findByRole('heading', { name: /issued at the arrival desk/i })).toBeTruthy()
    expect(screen.queryByTestId('pass-qr')).toBeNull()
    expectNoQrEmailedClaim()
  })

  it('shows recovery panels for broken or expired links — never a 404 page', async () => {
    mockTicketFailure({ response: { status: 404, data: {} } })
    const first = renderAt('/ticket/tok-broken')
    expect(await screen.findByRole('heading', { name: /couldn't open this pass/i })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /Find my registration/i }).length).toBeGreaterThan(0)
    first.unmount()

    client.get.mockReset()
    mockTicketFailure({ response: { status: 410, data: {} } })
    const second = renderAt('/ticket/tok-stale')
    expect(await screen.findByRole('heading', { name: /link has expired/i })).toBeTruthy()
    expectNoQrEmailedClaim()
    second.unmount()
  })

  it('serves the demo pass without any network call, labelled as demo', async () => {
    renderAt('/ticket/demo-pass')
    expect(await screen.findByTestId('pass-qr')).toBeTruthy()
    expect(client.get).not.toHaveBeenCalled()
    expect(screen.getByText(/Demo pass — sample data/i)).toBeTruthy()
    expect(screen.getByText('AIS26-XXXX')).toBeTruthy()
    expectNoQrEmailedClaim()
  })
})

/* ----------------------------------------------------------- contract */

describe('ticket contract normalization', () => {
  it('maps snake_case and camelCase keys to one shape', () => {
    const a = normalizeTicketResponse(
      { registration_status: 'CONFIRMED', ticket_status: 'ISSUED', participant: { name: 'A', pass_id: 'P1' } },
      't1'
    )
    expect(a.registrationStatus).toBe('CONFIRMED')
    expect(a.ticketStatus).toBe('ISSUED')
    expect(a.name).toBe('A')
    expect(a.passId).toBe('P1')

    const b = normalizeTicketResponse({ registrationStatus: 'RECEIVED', ticketStatus: 'NOT_ISSUED' }, 't2')
    expect(b.registrationStatus).toBe('RECEIVED')
    expect(b.ticketStatus).toBe('NOT_ISSUED')
  })

  it('marks unknown states instead of guessing (§7.1)', () => {
    expect(normalizeTicketResponse({ status: 'MAYBE' }, 't3').registrationStatus).toBe('UNSUPPORTED')
    expect(normalizeTicketResponse({}, 't4').registrationStatus).toBe('UNKNOWN')
    // confirmed but no pass data yet → the pass is issued at the desk
    expect(normalizeTicketResponse({ registration_status: 'CONFIRMED' }, 't5').ticketStatus).toBe('NOT_ISSUED')
  })

  it('recognises only the documented demo tokens', () => {
    expect(isDemoToken('demo')).toBe(true)
    expect(isDemoToken('demo-pass')).toBe(true)
    expect(isDemoToken('anything-else')).toBe(false)
    expect(isDemoToken(undefined)).toBe(false)
  })
})
