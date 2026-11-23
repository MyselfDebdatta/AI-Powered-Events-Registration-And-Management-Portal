import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, Lock, Mail, ShieldCheck, UserCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { KonarkMark } from '../components/public/KonarkMark'
import { platform, event } from '../content/event'
import { cn } from '../lib/cn'

/**
 * Staff sign-in — a focused, role-aware login using the same design system as
 * the public site (Konark mark, ink/ivory, gold accent). The Admin / Volunteer
 * toggle sets the intended destination; the backend still decides the actual
 * role and access. All three legacy routes (/login, /admin/login,
 * /volunteer/login) render this page.
 */
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const pathRole = location.pathname.startsWith('/admin')
    ? 'ADMIN'
    : location.pathname.startsWith('/volunteer')
      ? 'VOLUNTEER'
      : 'ADMIN'
  const [role, setRole] = useState(pathRole)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const userData = await login(email, password)
      const returnTo = new URLSearchParams(location.search).get('returnTo')
      const from = location.state?.from
      if (from?.pathname) {
        navigate(`${from.pathname}${from.search ?? ''}`, { replace: true })
      } else if (returnTo && returnTo.startsWith('/')) {
        navigate(returnTo, { replace: true })
      } else if (userData.role === 'ADMIN') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/volunteer', { replace: true })
      }
    } catch {
      // Error handled in AuthContext
    }
  }

  const roles = [
    { id: 'ADMIN', label: 'Admin', icon: ShieldCheck, hint: 'Operations & management' },
    { id: 'VOLUNTEER', label: 'Volunteer', icon: UserCheck, hint: 'Arrival desk & scanning' },
  ]
  const active = roles.find((r) => r.id === role) ?? roles[0]
  const ActiveIcon = active.icon

  return (
    <div className="flex min-h-screen flex-col bg-ivory-100">
      {/* Masthead — same lockup as the public site */}
      <header className="border-b border-border bg-ivory-100">
        <div className="container-wide flex h-[64px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="GeekAI Registration Portal — home">
            <KonarkMark className="h-8 w-8 text-gold-600" />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-ink-900">
                GeekAI
              </span>
              <span className="mt-1 block text-[8px] uppercase tracking-[0.14em] text-muted">
                Registration portal · {event.shortName}
              </span>
            </span>
          </Link>
          <Link
            to="/register"
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-ink-900 px-4 text-[12px] font-medium text-ivory-50 hover:bg-ink-800"
          >
            Register interest
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-gold-500/30 bg-gold-100 text-gold-700">
              <ActiveIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-h2 font-semibold text-ink-900">Staff sign in</h1>
            <p className="mt-1 text-sm text-muted">{platform.owner} · {active.label} access</p>
          </div>

          {/* Admin / Volunteer toggle */}
          <div
            role="tablist"
            aria-label="Staff role"
            className="mb-5 grid grid-cols-2 gap-1 rounded-md border border-border bg-sand-100 p-1"
          >
            {roles.map((item) => {
              const Icon = item.icon
              const selected = role === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setRole(item.id)}
                  className={cn(
                    'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-sm px-2 py-2 text-[12px] font-semibold transition-colors',
                    selected
                      ? 'bg-paper text-ink-900 shadow-sm'
                      : 'text-muted hover:text-ink-900'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                  <span className="text-[9px] font-normal text-muted">{item.hint}</span>
                </button>
              )
            })}
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border border-border bg-paper p-6 shadow-sm"
          >
            <Input
              label="Email"
              type="email"
              icon={Mail}
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign in as {active.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted">
              Access is granted by your account role on the server. Choose the area you intend to
              open; the portal will route you to your authorised home.
            </p>
          </form>

          <p className="mt-5 text-center text-[11px] text-muted">
            Not staff?{' '}
            <Link to="/register" className="font-semibold text-ink-900 underline underline-offset-2">
              Register for the event
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-border bg-ink-900 py-4 text-center text-[10px] text-ivory-100/60">
        © {event.edition} GeekAI — Registration portal for {event.name}
      </footer>
    </div>
  )
}
