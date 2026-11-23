import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import client from './api/client'
import flags from './content/flags'

/**
 * Stage 4 — admin operations (Phase 4, mockup 07).
 * The API is mocked; the tests assert shell structure, live KPI arithmetic,
 * destructive confirmations, the void reason/backend gate, and that no
 * invented endpoint is called.
 */
vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: { ...actual.default, get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  }
})

const DASHBOARD = {
  total_participants: 100,
  total_sessions: 4,
  total_attendance_records: 30,
  event_checkins: 25,
  participants_by_category: { STUDENT: 90 },
  recent_registrations: [],
}
const SESSIONS = [{ id: 1, name: 'Hall A', location: 'Hall A', capacity: 50, start_time: '2026-11-21T09:00:00Z', end_time: '2026-11-21T11:00:00Z' }]
const PARTICIPANTS = {
  total: 2,
  items: [
    { id: 1, name: 'Asha Nayak', email: 'asha@example.com', institution: 'SOA', category: 'STUDENT', registered_at: '2026-03-01T10:00:00Z' },
    { id: 2, name: 'Rita Das', email: 'rita@example.com', institution: 'SOA', category: 'SPEAKER', registered_at: '2026-03-02T10:00:00Z' },
  ],
}
const VOLUNTEERS = [{ id: 1, name: 'Desk Volunteer', email: 'desk@example.com', is_active: true, attendance_count: 3, created_at: '2026-03-01T10:00:00Z' }]
const EVENT_ATTENDANCE = [{ id: 5, participant_id: 1, participant_name: 'Asha Nayak', method: 'QR', marked_at: '2026-11-21T10:40:00Z', session_id: null }]

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

function defaultGet(url) {
  if (url === '/admin/dashboard') return Promise.resolve({ data: DASHBOARD })
  if (url === '/sessions/') return Promise.resolve({ data: SESSIONS })
  if (url === '/participants/') return Promise.resolve({ data: PARTICIPANTS })
  if (url.startsWith('/participants/')) return Promise.resolve({ data: { ...PARTICIPANTS.items[0], attendances: EVENT_ATTENDANCE } })
  if (url === '/admin/volunteers') return Promise.resolve({ data: VOLUNTEERS })
  if (url === '/attendance/event') return Promise.resolve({ data: EVENT_ATTENDANCE })
  if (url === '/attendance/stats') return Promise.resolve({ data: { total_participants: 100, total_checked_in: 25, total_sessions: 4, attendance_by_method: { QR: 25 }, attendance_by_session: [] } })
  if (url.startsWith('/attendance/session/')) return Promise.resolve({ data: EVENT_ATTENDANCE })
  return Promise.reject(new Error(`unexpected GET ${url}`))
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ role: 'ADMIN', name: 'Ops Lead' }))
  client.get.mockReset(); client.post.mockReset(); client.put.mockReset()
  client.patch.mockReset(); client.delete.mockReset()
  client.get.mockImplementation(defaultGet)
  client.post.mockResolvedValue({ data: {} })
  client.put.mockResolvedValue({ data: {} })
  client.patch.mockResolvedValue({ data: { name: 'Desk Volunteer', is_active: false } })
  client.delete.mockResolvedValue({ data: {} })
})

afterEach(() => {
  cleanup()
  flags.voidAttendance = false
  flags.importsV2 = false
  flags.liveOps = false
  flags.reconciliation = false
  flags.settingsV2 = false
  flags.auditV2 = false
  localStorage.clear()
})

describe('Admin shell (Phase 4)', () => {
  it('renders the ink sidebar, operations and system nav, and a top bar', async () => {
    renderAt('/admin/dashboard')
    expect(await screen.findByRole('heading', { name: 'Event overview' })).toBeTruthy()
    const navs = screen.getAllByRole('complementary', { name: 'Admin navigation' })
    expect(navs.length).toBeGreaterThanOrEqual(1)
    for (const label of ['Overview', 'Participants', 'Sessions', 'Attendance', 'Volunteers', 'Export', 'Imports', 'Live ops', 'Reconciliation', 'Settings', 'Audit log']) {
      expect(screen.getAllByRole('link', { name: new RegExp(label) }).length).toBeGreaterThan(0)
    }
  })
})

describe('Overview dashboard (Phase 4)', () => {
  it('computes registered, arrived and not-arrived from the live stats', async () => {
    renderAt('/admin/dashboard')
    expect(await screen.findByText('Event overview')).toBeTruthy()
    expect((await screen.findAllByText('100')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('25')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('75')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('25% of registered')).length).toBeGreaterThan(0)
    expect(client.get).toHaveBeenCalledWith('/admin/dashboard')
    expect(client.get).toHaveBeenCalledWith('/sessions/')
  })

  it('does not invent arrival chart data when no arrivals endpoint exists', async () => {
    renderAt('/admin/dashboard')
    expect(await screen.findByText(/No arrivals endpoint yet/i)).toBeTruthy()
  })
})

describe('Participants and detail (Phase 4)', () => {
  it('lists participants and opens a row', async () => {
    renderAt('/admin/participants')
    expect((await screen.findAllByText('Asha Nayak')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rita Das').length).toBeGreaterThan(0)
    await userEvent.type(await screen.findByLabelText('Search'), 'Asha')
    expect((await screen.findAllByText('Asha Nayak')).length).toBeGreaterThan(0)
    expect(client.get).toHaveBeenCalledWith('/participants/', expect.objectContaining({ params: expect.objectContaining({ search: 'Asha' }) }))
  })

  it('shows the participant record and event arrival status', async () => {
    renderAt('/admin/participants/1')
    expect(await screen.findByText('Participant record')).toBeTruthy()
    expect(screen.getAllByText('Asha Nayak').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Checked in/i).length).toBeGreaterThan(0)
    expect(client.get).toHaveBeenCalledWith('/participants/1')
  })
})

describe('Sessions (Phase 4)', () => {
  it('lists sessions and requires confirmation before delete', async () => {
    renderAt('/admin/sessions')
    expect((await screen.findAllByText('Hall A')).length).toBeGreaterThan(0)
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete Hall A' })[0])
    expect(await screen.findByText('Delete this session?')).toBeTruthy()
    expect(client.delete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Delete session' }))
    await waitFor(() => expect(client.delete).toHaveBeenCalledWith('/sessions/1'))
  })

  it('creates a session with the live contract', async () => {
    renderAt('/admin/sessions')
    await userEvent.click(await screen.findByRole('button', { name: /New session/i }))
    const dialog = await screen.findByRole('dialog')
    const name = within(dialog).getByLabelText(/Session name/i)
    await userEvent.type(name, 'Workshop 1')
    await userEvent.click(screen.getByRole('button', { name: 'Create session' }))
    await waitFor(() => expect(client.post).toHaveBeenCalledWith('/sessions/', expect.objectContaining({ name: 'Workshop 1' })))
  })
})

describe('Attendance void flow (Phase 4)', () => {
  it('requires a reason and never writes when the endpoint is missing', async () => {
    renderAt('/admin/attendance')
    expect((await screen.findAllByText('Asha Nayak')).length).toBeGreaterThan(0)
    await userEvent.click(screen.getAllByRole('button', { name: /Void record for Asha Nayak/i })[0])
    expect(await screen.findByText('Void this attendance record?')).toBeTruthy()
    expect(screen.getByText(/Waiting for backend/i)).toBeTruthy()
    const voidButton = screen.getByRole('button', { name: 'Void record' })
    expect(voidButton.disabled).toBe(true)
    await userEvent.selectOptions(screen.getByLabelText(/Reason for void/i), 'DUPLICATE')
    expect(voidButton.disabled).toBe(true)
    expect(client.post).not.toHaveBeenCalled()
    expect(client.patch).not.toHaveBeenCalled()
  })

  it('enables the write only when the void endpoint is flagged on and a reason is chosen', async () => {
    flags.voidAttendance = true
    renderAt('/admin/attendance')
    await userEvent.click((await screen.findAllByRole('button', { name: /Void record for Asha Nayak/i }))[0])
    const voidButton = screen.getByRole('button', { name: 'Void record' })
    expect(voidButton.disabled).toBe(true)
    await userEvent.selectOptions(screen.getByLabelText(/Reason for void/i), 'DUPLICATE')
    expect(voidButton.disabled).toBe(false)
  })
})

describe('Volunteers and export (Phase 4)', () => {
  it('lists volunteers, toggles status and confirms removal', async () => {
    renderAt('/admin/volunteers')
    expect((await screen.findAllByText('Desk Volunteer')).length).toBeGreaterThan(0)
    await userEvent.click(screen.getAllByRole('button', { name: 'Deactivate Desk Volunteer' })[0])
    await waitFor(() => expect(client.patch).toHaveBeenCalledWith('/admin/volunteers/1/toggle-status'))
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove Desk Volunteer' })[0])
    expect(await screen.findByText('Remove this volunteer?')).toBeTruthy()
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove', exact: true })[0])
    await waitFor(() => expect(client.delete).toHaveBeenCalledWith('/admin/volunteers/1'))
  })

  it('downloads participants CSV from the live export endpoint', async () => {
    renderAt('/admin/export')
    await userEvent.click(await screen.findByRole('button', { name: /Download CSV/i }))
    await waitFor(() => expect(client.get).toHaveBeenCalledWith('/admin/export/participants', { responseType: 'blob' }))
  })
})

describe('Flag-gated admin screens (Phase 4)', () => {
  it('shows Waiting for backend on imports, live ops and audit', async () => {
    for (const route of ['/admin/imports', '/admin/live-ops', '/admin/audit']) {
      const view = renderAt(route)
      expect(await screen.findByText(/waiting for the hub/i)).toBeTruthy()
      view.unmount()
    }
    // No guessed endpoints were called while the flags are off.
    expect(client.get.mock.calls.some(([url]) => url.includes('imports') || url.includes('live-ops') || url.includes('audit'))).toBe(false)
  })

  it('derives a live reconciliation funnel without a dedicated endpoint', async () => {
    renderAt('/admin/reconciliation')
    expect((await screen.findAllByText('Reconciliation')).length).toBeGreaterThan(0)
    expect(screen.getByText(/Variance details are waiting for the hub/i)).toBeTruthy()
    expect(screen.getAllByText('Registered').length).toBeGreaterThan(0)
    expect((await screen.findAllByText('100')).length).toBeGreaterThan(0)
  })
})
