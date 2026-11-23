import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import client from './api/client'
import flags from './content/flags'
import { clearQueue, enqueue, readQueue } from './lib/outbox'
import CandidateList from './components/volunteer/CandidateList'
import ScanResult from './components/volunteer/ScanResult'
import SyncStatus from './components/volunteer/SyncStatus'
import BadgePrint from './components/ticket/BadgePrint'

/**
 * Stage 3 / Phase 3 — volunteer arrival and scanning (§7.5/§7.6).
 * The arrival-write and QR-verify endpoints do not exist yet, so the tests
 * assert the safe states: gold confirmation, "Waiting for backend" instead of
 * invented endpoints, forged QR refused before any write, offline captures
 * queued with a count.
 */

const html5 = vi.hoisted(() => {
  const state = { success: null }
  class FakeScanner {
    start(_constraints, _config, onSuccess) {
      state.success = onSuccess
      return Promise.resolve()
    }
    stop() {
      return Promise.resolve()
    }
    clear() {}
    getRunningTrackCapabilities() {
      return {}
    }
  }
  return { state, FakeScanner }
})

vi.mock('html5-qrcode/esm/html5-qrcode.js', () => ({ Html5Qrcode: html5.FakeScanner }))

vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn(),
      post: vi.fn(),
    },
  }
})

const PARTICIPANT = {
  id: 7,
  name: 'Asha Nayak',
  email: 'asha@example.com',
  phone: null,
  institution: 'SOA University',
  category: 'Student',
  photo_url: null,
  registered_at: '2026-03-01T10:42:00Z',
}

function signIn() {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem(
    'user',
    JSON.stringify({ role: 'VOLUNTEER', name: 'Demo Volunteer' })
  )
}

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

function defaultGet(url) {
  if (url === '/attendance/event') return Promise.resolve({ data: [] })
  if (url === '/sessions/') {
    return Promise.resolve({ data: [{ id: 3, name: 'Hall A' }] })
  }
  if (url === '/participants/7') {
    return Promise.resolve({ data: { ...PARTICIPANT, attendances: [] } })
  }
  if (url === '/participants/') {
    return Promise.resolve({ data: { total: 1, items: [PARTICIPANT] } })
  }
  return Promise.reject(new Error(`unexpected GET ${url}`))
}

async function confirmManualCandidate() {
  await userEvent.click(screen.getByRole('button', { name: 'This is the person' }))
  await userEvent.selectOptions(
    screen.getByLabelText(/Which ID did you check/i),
    'Photo ID checked'
  )
}

async function startScanner() {
  const buttons = await screen.findAllByRole('button', { name: /Start scanner/i })
  await userEvent.click(buttons[0])
  await waitFor(() => expect(html5.state.success).toBeTruthy())
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  clearQueue()
  signIn()
  client.get.mockReset()
  client.post.mockReset()
  client.get.mockImplementation(defaultGet)
  client.post.mockResolvedValue({ data: {} })
  html5.state.success = null
})

afterEach(() => {
  cleanup()
  flags.arrivalV2 = false
  flags.scanV2 = false
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  localStorage.clear()
  sessionStorage.clear()
  clearQueue()
})

describe('Volunteer shell and desk home (§7.5)', () => {
  it('renders the ink app bar, five sections and a persisted desk selector', async () => {
    renderAt('/volunteer/dashboard')

    expect(
      await screen.findByRole('heading', { name: /Good to see you/i })
    ).toBeTruthy()

    const navs = screen.getAllByRole('navigation', { name: 'Volunteer sections' })
    expect(navs.length).toBeGreaterThanOrEqual(2)
    for (const label of ['Arrival', 'Scan', 'Manual', 'Queue', 'Help']) {
      expect(screen.getAllByRole('link', { name: new RegExp(label) }).length).toBeGreaterThan(0)
    }

    const deskSelect = screen.getAllByRole('combobox')[0]
    await userEvent.selectOptions(deskSelect, 'desk-03')
    expect(localStorage.getItem('geekai.volunteer.desk')).toBe('desk-03')
  })

  it('shows offline queue state on the dashboard', async () => {
    enqueue({
      kind: 'ARRIVAL',
      participant: { id: 7, name: 'Asha Nayak' },
      method: 'FACE',
      station: 'ST-01',
      desk: 'desk-01',
    })
    renderAt('/volunteer/dashboard')
    expect(await screen.findByText(/Offline — 1 pending|1 pending/)).toBeTruthy()
  })
})

describe('Arrival desk (§7.5)', () => {
  it('loads a manual candidate but waits for explicit confirmation and a reason', async () => {
    renderAt('/volunteer/arrival?participant=7')

    expect(await screen.findByText('Asha Nayak')).toBeTruthy()
    expect(screen.getAllByText(/Manual fallback/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Volunteer confirmation required/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Verify identity').length).toBeGreaterThan(0)

    // No issue action exists until the volunteer picks a candidate.
    expect(screen.queryByRole('button', { name: /Issue QR pass/i })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'This is the person' }))
    const issue = screen.getByRole('button', { name: /Issue QR pass/i })
    expect(issue.disabled).toBe(true) // a reason is still required

    await userEvent.selectOptions(
      screen.getByLabelText(/Which ID did you check/i),
      'Photo ID checked'
    )
    expect(issue.disabled).toBe(false)
  })

  it('shows "Waiting for backend" instead of inventing an issue endpoint', async () => {
    renderAt('/volunteer/arrival?participant=7')
    await screen.findByText('Asha Nayak')
    await confirmManualCandidate()
    await userEvent.click(screen.getByRole('button', { name: /Issue QR pass/i }))

    expect(await screen.findByText('Waiting for backend')).toBeTruthy()
    expect(screen.getByText(/POST \/api\/arrivals/)).toBeTruthy()
    expect(client.post).not.toHaveBeenCalled()
  })

  it('issues only after confirmation when the arrival endpoints are live', async () => {
    flags.arrivalV2 = true
    client.post.mockImplementation((url) => {
      if (url === '/arrivals') return Promise.resolve({ data: { status: 'ARRIVED' } })
      if (url === '/qr/issue') {
        return Promise.resolve({
          data: { token: 'signed.payload-token', pass_id: 'AIS26-0007' },
        })
      }
      return Promise.reject(new Error(`unexpected POST ${url}`))
    })

    renderAt('/volunteer/arrival?participant=7')
    await screen.findByText('Asha Nayak')
    await confirmManualCandidate()
    await userEvent.click(screen.getByRole('button', { name: /Issue QR pass/i }))

    expect(await screen.findByText('Pass issued')).toBeTruthy()
    expect(screen.getByText('AIS26-0007')).toBeTruthy()
    expect(document.querySelector('[data-testid="pass-qr"]')).toBeTruthy()
    expect(client.post.mock.calls[0][0]).toBe('/arrivals')
    expect(client.post.mock.calls[0][1]).toMatchObject({
      participant_id: 7,
      station_id: 'ST-01',
      method: 'MANUAL',
    })
    expect(client.post.mock.calls[1][0]).toBe('/qr/issue')
  })

  it('saves an offline capture with a visible pending count and no success claim', async () => {
    flags.arrivalV2 = true
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    renderAt('/volunteer/arrival?participant=7')
    await screen.findByText('Asha Nayak')
    await confirmManualCandidate()
    await userEvent.click(screen.getByRole('button', { name: /Issue QR pass/i }))

    expect(await screen.findByText('Saved on this device')).toBeTruthy()
    expect(screen.getAllByText(/Pending sync/i).length).toBeGreaterThan(0)
    expect(client.post).not.toHaveBeenCalled()
    expect(readQueue()).toHaveLength(1)
    expect(readQueue()[0].participant.id).toBe(7)
  })

  it('starts with the camera off and keeps capture disabled until ready', async () => {
    renderAt('/volunteer/arrival')
    expect((await screen.findAllByRole('button', { name: /Start camera/i })).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Capture and verify/i }).disabled).toBe(true)
  })
})

describe('Candidate confirmation (§7.5)', () => {
  it('never auto-selects and requires "This is the person"', async () => {
    const onConfirm = vi.fn()
    render(
      <CandidateList
        candidates={[
          { participant: { id: 1, name: 'First Person' }, score: 0.98 },
          { participant: { id: 2, name: 'Second Person' }, score: 0.91 },
        ]}
        lowConfidence
        onConfirm={onConfirm}
      />
    )

    expect(screen.getByText(/Low confidence/i)).toBeTruthy()
    const buttons = screen.getAllByRole('button', { name: 'This is the person' })
    expect(buttons).toHaveLength(2)
    buttons.forEach((button) => expect(button.getAttribute('aria-pressed')).toBe('false'))

    await userEvent.click(buttons[0])
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ name: 'First Person' }))
  })
})

describe('QR scanner (§7.6)', () => {
  it('rejects unsigned QR JSON before any request or attendance write', async () => {
    renderAt('/volunteer/scan')
    await startScanner()
    await act(async () => {
      await html5.state.success('{"participant_id":7,"name":"Asha Nayak"}')
    })

    expect(await screen.findByText('Invalid pass')).toBeTruthy()
    expect(screen.getByText(/not a signed pass/i)).toBeTruthy()
    expect(client.post).not.toHaveBeenCalled()
  })

  it('does not fall back to the legacy unsigned endpoint when verify is not live', async () => {
    renderAt('/volunteer/scan')
    await startScanner()
    await act(async () => {
      await html5.state.success('c2lnbmVkLXRva2Vu.c2lnbmF0dXJlLXZhbHVl')
    })

    expect(await screen.findByText('Verification unavailable')).toBeTruthy()
    expect(screen.getAllByText(/not live yet/i).length).toBeGreaterThan(0)
    expect(client.post).not.toHaveBeenCalled()
  })

  it('records an entry only from the server decision', async () => {
    flags.scanV2 = true
    client.post.mockResolvedValue({
      data: { decision: 'VALID', participant: { id: 9, name: 'Rita Das', institution: 'SOA' } },
    })
    renderAt('/volunteer/scan')
    await startScanner()
    await act(async () => {
      await html5.state.success('c2lnbmVkLXRva2Vu.c2lnbmF0dXJlLXZhbHVl')
    })

    expect(await screen.findByText('Entry recorded')).toBeTruthy()
    expect(screen.getAllByText('Rita Das').length).toBeGreaterThan(0)
    expect(client.post).toHaveBeenCalledWith(
      '/qr/verify',
      expect.objectContaining({ scope: 'ENTRY', station_id: 'ST-01' })
    )
    expect(client.post).not.toHaveBeenCalledWith('/attendance/', expect.anything())
  })

  it('labels duplicates and session scans correctly', async () => {
    flags.scanV2 = true
    client.post.mockResolvedValue({
      data: { decision: 'DUPLICATE', participant: { id: 9, name: 'Rita Das' } },
    })
    renderAt('/volunteer/scan')
    await userEvent.click(screen.getByRole('button', { name: 'Session' }))
    await userEvent.selectOptions(screen.getByLabelText('Session'), '3')
    await startScanner()
    await act(async () => {
      await html5.state.success('c2lnbmVkLXRva2Vu.c2lnbmF0dXJlLXZhbHVl')
    })

    expect(await screen.findByText('Already marked for this session')).toBeTruthy()
    expect(client.post).toHaveBeenCalledWith(
      '/qr/verify',
      expect.objectContaining({ scope: 'SESSION', session_id: 3 })
    )
  })

  it('renders every result state with text and a next action', () => {
    const cases = [
      ['valid', 'entry', 'Entry recorded'],
      ['valid', 'session', 'Attendance recorded'],
      ['duplicate', 'entry', 'Already checked in'],
      ['duplicate', 'session', 'Already marked for this session'],
      ['invalid', 'entry', 'Invalid pass'],
      ['expired', 'entry', 'Pass expired'],
      ['wrong-scope', 'entry', 'Wrong pass for this checkpoint'],
      ['offline', 'entry', 'Saved offline'],
      ['backend-pending', 'entry', 'Verification unavailable'],
      ['camera-error', 'entry', 'Camera unavailable'],
    ]

    for (const [state, mode, label] of cases) {
      const view = render(
        <ScanResult
          state={state}
          mode={mode}
          pendingCount={2}
          onScanNext={() => {}}
          onManualLookup={() => {}}
          onRetry={() => {}}
          onIssueNew={() => {}}
        />
      )
      expect(screen.getByText(label)).toBeTruthy()
      view.unmount()
    }
  })
})

describe('Manual lookup (§7.5/§7.6)', () => {
  it('finds a participant and hands them to the arrival desk', async () => {
    renderAt('/volunteer/manual?mode=entry')
    await userEvent.type(await screen.findByLabelText('Search participants'), 'As')

    expect(await screen.findByText('Asha Nayak')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Use for arrival' })
    expect(link.getAttribute('href')).toBe('/volunteer/arrival?participant=7')
  })

  it('records session attendance with the manual method', async () => {
    renderAt('/volunteer/manual?mode=session&session=3')
    await userEvent.type(await screen.findByLabelText('Search participants'), 'As')
    await screen.findByText('Asha Nayak')
    await userEvent.click(screen.getByRole('button', { name: /Mark attendance/i }))

    expect(await screen.findByText('Attendance recorded')).toBeTruthy()
    expect(client.post).toHaveBeenCalledWith('/attendance/', {
      participant_id: 7,
      session_id: 3,
      method: 'MANUAL',
    })
  })

  it('reports a duplicate session scan without writing again', async () => {
    client.post.mockRejectedValue({
      response: { status: 409, data: { detail: 'Already recorded' }, headers: {} },
    })
    renderAt('/volunteer/manual?mode=session&session=3')
    await userEvent.type(await screen.findByLabelText('Search participants'), 'As')
    await screen.findByText('Asha Nayak')
    await userEvent.click(screen.getByRole('button', { name: /Mark attendance/i }))

    expect(await screen.findByText('Already marked for this session')).toBeTruthy()
  })
})

describe('Offline queue, sync status and badge', () => {
  it('lists saved records and discards only after confirmation', async () => {
    enqueue({
      kind: 'ARRIVAL',
      participant: { id: 7, name: 'Asha Nayak' },
      method: 'FACE',
      station: 'ST-01',
      desk: 'desk-01',
    })
    renderAt('/volunteer/queue')

    expect(await screen.findByText('Asha Nayak')).toBeTruthy()
    expect(screen.getByText('Saved captures cannot sync yet')).toBeTruthy()

    await userEvent.click(
      screen.getByRole('button', { name: /Discard record for Asha Nayak/i })
    )
    await userEvent.click(screen.getByRole('button', { name: 'Discard record' }))

    expect(await screen.findByText('Nothing is waiting')).toBeTruthy()
    expect(readQueue()).toHaveLength(0)
  })

  it('names the pending count in both sync variants', () => {
    const view = render(<SyncStatus pending={3} online={false} />)
    expect(screen.getByText('Offline — 3 pending')).toBeTruthy()
    view.rerender(<SyncStatus pending={2} online />)
    expect(screen.getByText('2 pending sync')).toBeTruthy()
  })

  it('prints a CR80 badge and never shows a placeholder QR', () => {
    const view = render(
      <BadgePrint
        participant={{ name: 'Asha Nayak', institution: 'SOA University', category: 'Student' }}
        passId="AIS26-0007"
        token="signed.payload-token"
        station="ST-01"
      />
    )
    expect(screen.getAllByText('Asha Nayak').length).toBeGreaterThan(0)
    expect(screen.getAllByText('AIS26-0007').length).toBeGreaterThan(0)
    expect(document.querySelector('.badge-print-sheet > [data-testid="badge-print"]')).toBeTruthy()

    view.rerender(
      <BadgePrint
        participant={{ name: 'Asha Nayak', institution: 'SOA University', category: 'Student' }}
      />
    )
    expect(screen.getAllByText(/No QR until the pass is issued/i).length).toBeGreaterThan(0)
  })

  it('renders the desk runbook without inventing a contact address', async () => {
    renderAt('/volunteer/help')
    expect(await screen.findByText('Desk runbook')).toBeTruthy()
    expect(screen.getByText('The 30-second arrival flow')).toBeTruthy()
    expect(screen.getByText('If the network drops')).toBeTruthy()
    expect(screen.getByText(/Never say a pass was emailed/i)).toBeTruthy()
  })
})
