import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './context/AuthContext'

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

/** Every page must avoid the forbidden "QR emailed" claim (§7.1 content rules). */
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

const publicRoutes = [
  ['/', /Registration,/i],
  ['/venue', /Find your way in/i],
  ['/faq', /Good to know/i],
  ['/privacy', /Privacy notice/i],
  ['/accessibility', /Accessibility of this portal/i],
  ['/code-of-conduct', /Code of conduct/i],
  ['/registration/status', /Check your registration status/i],
  ['/register', /Register for the event/i],
]

describe('Stage 2 public routes', () => {
  it.each(publicRoutes)('renders %s with its heading', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeTruthy()
    expectNoQrEmailedClaim()
  })

  it('renders every public route inside the public shell (header + footer)', async () => {
    renderAt('/faq')
    await screen.findByRole('heading', { level: 1, name: /Good to know/i })
    // PublicLayout masthead + PageHero both use <header>; the shell one is first.
    const banners = screen.getAllByRole('banner')
    expect(banners.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('contentinfo')).toBeTruthy() // <footer>
    // Footer "Registration status" is guarded by the ticketPage flag (ON in dev)
    const footer = within(screen.getByRole('contentinfo'))
    expect(footer.getByRole('link', { name: 'Registration status' })).toBeTruthy()
  })

  it('offers a one-click path from the landing hero to registration', async () => {
    renderAt('/')
    await screen.findByRole('heading', { level: 1, name: /Registration,/i })
    const links = screen.getAllByRole('link', { name: /Register interest/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links.some((a) => a.getAttribute('href') === '/register')).toBe(true)
  })

  it('presents itself as the GeekAI portal currently serving the event', async () => {
    renderAt('/')
    await screen.findByRole('heading', { level: 1, name: /Registration,/i })
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/GeekAI Developer Team/i)
    expect(text).toMatch(/Odisha AI Symposium 2026/i)
    expect(text).toMatch(/currently serving/i)
    expect(text).not.toMatch(/can be reused for future events/i)
    expect(screen.queryByRole('link', { name: /speakers/i })).toBeNull()
  })

  it('shows honest placeholders on the landing page', async () => {
    renderAt('/')
    await screen.findByRole('heading', { level: 1, name: /Registration,/i })
    expect(screen.getAllByText('Date to be announced').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/registration required/i).length).toBeGreaterThan(0)
    // portal/event attribution instead of the old working-copy label
    expect(screen.getByText(/operates this registration portal only/i)).toBeTruthy()
  })
})

describe('Stage 2 in-site registration form', () => {
  it('renders the real form with all required fields and no external handoff', async () => {
    renderAt('/register')
    await screen.findByRole('heading', { level: 1, name: /Register for the event/i })
    expect(screen.getByRole('textbox', { name: /Full name/i })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: /Email/i })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: /Category/i })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /consent to the collection/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Submit registration/i })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/google forms?/i)
    expectNoQrEmailedClaim()
    expect(screen.getAllByText(/pass is issued at the arrival desk/i).length).toBeGreaterThan(0)
  })

  it('validates required fields and shows a summary on submit', async () => {
    const user = userEvent.setup()
    renderAt('/register')
    await screen.findByRole('heading', { level: 2, name: /Your details/i })
    await user.click(screen.getByRole('button', { name: /Submit registration/i }))
    expect(await screen.findByText(/Please check 7 fields before submitting/i)).toBeTruthy()
    expect(screen.getAllByText(/Full name is required/i).length).toBeGreaterThan(0)
    expectNoQrEmailedClaim()
  })

  it('links already-registered participants to status in one click', async () => {
    renderAt('/register')
    await screen.findByRole('heading', { level: 1, name: /Register for the event/i })
    const statusLink = screen.getByRole('link', { name: /Already registered\? Check status/i })
    expect(statusLink.getAttribute('href')).toBe('/registration/status')
  })

  it('sends unauthenticated visitors to sign in for assisted registration', async () => {
    renderAt('/register/assisted')
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeTruthy()
  })
})

describe('Featured work', () => {
  it('shows the GeekAI-managed event and links to its official site', async () => {
    renderAt('/')
    await screen.findByRole('heading', { level: 2, name: /Featured work/i })
    expect(screen.getAllByText(/Odisha AI Symposium 2026/i).length).toBeGreaterThan(0)
    expectNoQrEmailedClaim()
  })
})
