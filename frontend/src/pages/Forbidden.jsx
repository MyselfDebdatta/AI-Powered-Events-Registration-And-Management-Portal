import { Link, useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'

/**
 * Forbidden — 403: names the current role, points at the correct home and
 * offers sign-out; never a redirect loop (§6.6, §7.9).
 */
export function Forbidden() {
  const { user, isAdmin, isVolunteer, logout } = useAuth()
  const navigate = useNavigate()
  const home = isAdmin ? '/admin/dashboard' : isVolunteer ? '/volunteer/dashboard' : '/'

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-lg rounded-md border border-border bg-paper p-8 text-center shadow-lg">
        <ShieldX className="mx-auto h-10 w-10 text-status-danger" aria-hidden="true" />
        <p className="mt-3 font-mono text-sm text-text-muted">403</p>
        <h1 className="mt-1 text-h3 text-text">You don't have access to this area</h1>
        <p className="mx-auto mt-3 max-w-prose text-sm text-text-muted">
          You're signed in as{' '}
          <span className="font-medium text-text">{user?.role ?? 'guest'}</span>.
          If you think this is a mistake, contact the host office.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={home}
            className="inline-flex min-h-11 items-center rounded-sm bg-ink-900 px-5 text-sm font-medium text-ivory-50 transition-colors duration-fast hover:bg-ink-800"
          >
            Go to my home
          </Link>
          <Button variant="secondary" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </main>
  )
}

export default Forbidden
