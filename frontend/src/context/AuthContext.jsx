import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import client from '../api/client'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

/**
 * Decode a JWT payload (base64url → UTF-8 JSON). Returns null when the token
 * is opaque or malformed — callers must treat that as "no expiry known",
 * never as "logged out", so an opaque-token backend keeps working.
 */
function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

function readSession() {
  const storedUser = localStorage.getItem('user')
  const token = localStorage.getItem('token')
  if (!storedUser || !token) return null

  const claims = decodeToken(token)
  // Expired token: clear immediately so a stale session never looks valid.
  if (claims?.exp && claims.exp * 1000 <= Date.now()) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return { expired: true }
  }

  try {
    const user = JSON.parse(storedUser)
    return {
      ...user,
      sub: claims?.sub ?? null,
      exp: claims?.exp ?? null,
    }
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession())
  const [loading, setLoading] = useState(false)

  // A 401 anywhere clears storage in api/client.js; sync React state here so
  // ProtectedRoute redirects (preserving returnTo) instead of looping.
  useEffect(() => {
    const onLogout = () => setSession(null)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  const persist = useCallback((token, userData) => {
    const claims = decodeToken(token)
    const nextUser = {
      ...userData,
      sub: claims?.sub ?? null,
      exp: claims?.exp ?? null,
    }
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(nextUser))
    setSession(nextUser)
    return nextUser
  }, [])

  const login = useCallback(
    async (email, password) => {
      setLoading(true)
      try {
        const { data } = await client.post('/auth/login', { email, password })
        const { access_token, role, name } = data
        const userData = persist(access_token, { role, name })
        toast.success(`Welcome back, ${name}!`)
        return userData
      } catch (error) {
        const msg = error.response?.data?.detail || 'Login failed'
        toast.error(typeof msg === 'string' ? msg : 'Login failed')
        throw error
      } finally {
        setLoading(false)
      }
    },
    [persist]
  )

  const logout = useCallback(
    (options = {}) => {
      const { silent = false } = options
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setSession(null)
      if (!silent) toast.success('Logged out successfully')
    },
    []
  )

  // Session-expiry UX: warn before a write fails (WCAG 2.2.1 / §7.8).
  useEffect(() => {
    if (!session?.exp) return undefined
    const msLeft = session.exp * 1000 - Date.now()
    if (msLeft <= 0) {
      logout({ silent: true })
      toast.error('Your session expired. Please sign in again.')
      return undefined
    }
    const timer = window.setTimeout(
      () => {
        logout({ silent: true })
        toast.error('Your session expired. Please sign in again.')
      },
      Math.min(msLeft, 2 ** 31 - 1)
    )
    return () => window.clearTimeout(timer)
  }, [session?.exp, logout])

  // Expired-token listener: catch sessions that lapse while the tab is open
  // but outside a request (the request path is handled by api/client.js).
  useEffect(() => {
    if (!session?.exp) return undefined
    const interval = window.setInterval(() => {
      if (session.exp * 1000 <= Date.now()) {
        logout({ silent: true })
        toast.error('Your session expired. Please sign in again.')
      }
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [session?.exp, logout])

  const user = session && !session.expired ? session : null
  const token = user ? localStorage.getItem('token') : null
  const isAuthenticated = Boolean(user && token)
  const isAdmin = user?.role === 'ADMIN'
  const isVolunteer = user?.role === 'VOLUNTEER'

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      isAuthenticated,
      isAdmin,
      isVolunteer,
      sessionExpiresAt: user?.exp ? user.exp * 1000 : null,
    }),
    [user, token, loading, login, logout, isAuthenticated, isAdmin, isVolunteer]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
