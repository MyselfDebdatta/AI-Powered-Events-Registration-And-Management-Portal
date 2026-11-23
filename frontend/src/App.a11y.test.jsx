import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import client from './api/client'
import flags from './content/flags'

/**
 * Stage 5 — accessibility audit (§12.3).
 * axe-core runs against the real rendered routes; jsdom cannot compute
 * colour contrast (no layout), so that rule is verified separately through
 * the token palette in index.css. All other WCAG 2.2 A/AA rules are enforced.
 */
vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: { ...actual.default, get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  }
})

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

function renderAt(path, role) {
  if (role) {
    localStorage.setItem('token', 'a11y-token')
    localStorage.setItem('user', JSON.stringify({ role, name: 'Audit User' }))
  }
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

async function audit(path, role) {
  renderAt(path, role)
  const results = await axe.run(document.body, {
    runOnly: { type: 'tag', values: TAGS },
    rules: { 'color-contrast': { enabled: false } },
  })
  const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact))
  return {
    serious,
    summary: serious.map(
      (v) => `${v.id}:${v.impact} ${v.nodes.map((n) => n.html.slice(0, 90)).join(' | ')}`
    ),
  }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  flags.arrivalV2 = false
  flags.scanV2 = false
  client.get.mockReset()
  client.post.mockReset()
  client.get.mockImplementation((url) => {
    if (url === '/attendance/event') return Promise.resolve({ data: [] })
    if (url === '/sessions/') return Promise.resolve({ data: [] })
    if (url === '/admin/dashboard') {
      return Promise.resolve({
        data: { total_participants: 0, total_sessions: 0, total_attendance_records: 0, event_checkins: 0, participants_by_category: {}, recent_registrations: [] },
      })
    }
    if (url === '/admin/volunteers') return Promise.resolve({ data: [] })
    if (url.startsWith('/participants/')) return Promise.resolve({ data: { id: 1, name: 'Audit Person', category: 'STUDENT' } })
    if (url === '/participants/') return Promise.resolve({ data: { total: 0, items: [] } })
    return Promise.resolve({ data: [] })
  })
  client.post.mockResolvedValue({ data: {} })
  document.documentElement.lang = 'en-IN'
  document.title = 'Odisha AI Symposium 2026'
})

afterEach(() => {
  cleanup()
  flags.arrivalV2 = false
  flags.scanV2 = false
  localStorage.clear()
})

const ROUTES = [
  ['/', null],
  ['/register', null],
  ['/registration/status?token=demo', null],
  ['/ticket/demo-pass', null],
  ['/volunteer/arrival', 'VOLUNTEER'],
  ['/volunteer/scan', 'VOLUNTEER'],
  ['/volunteer/help', 'VOLUNTEER'],
  ['/admin/dashboard', 'ADMIN'],
  ['/admin/participants', 'ADMIN'],
  ['/login', null],
]

describe('WCAG 2.2 A/AA audit — zero critical or serious violations (§12.3)', () => {
  for (const [path, role] of ROUTES) {
    it(`has no critical/serious axe violations on ${path}`, async () => {
      const { serious, summary } = await audit(path, role)
      expect(summary, `axe violations on ${path}`).toEqual([])
      expect(serious).toEqual([])
    })
  }
})
