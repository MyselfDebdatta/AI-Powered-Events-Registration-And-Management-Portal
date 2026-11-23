import axios from 'axios'
import toast from 'react-hot-toast'

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Endpoints where a 401 is expected feedback (wrong password) or the page
// must keep working without a session (ticket/status links) — §6.6.
const EXEMPT_401 = [/^\/auth\/login/, /^\/auth\/refresh/, /^\/tickets\//]

/**
 * normalizeError — one shape for every failure so pages can render a proper
 * error state instead of parsing axios internals (§7.9).
 * Returns { status, message, fields, requestId, isNetwork }.
 */
export function normalizeError(error) {
  if (error?.response) {
    const { status, data, headers } = error.response
    const detail = data?.detail
    const fields = {}
    let message = data?.message || 'Something went wrong. Please try again.'

    if (Array.isArray(detail)) {
      message = detail.map((item) => item.msg).join('. ') || message
      detail.forEach((item) => {
        const field = Array.isArray(item.loc) ? item.loc[1] : null
        if (field) fields[field] = item.msg
      })
    } else if (typeof detail === 'string') {
      message = detail
    }

    return {
      status,
      message,
      fields,
      requestId: data?.request_id || headers?.['x-request-id'] || null,
      isNetwork: false,
    }
  }

  if (error?.request) {
    return {
      status: 0,
      message: 'Network error. Please check your connection.',
      fields: {},
      requestId: null,
      isNetwork: true,
    }
  }

  return {
    status: 0,
    message: error?.message || 'Unexpected error.',
    fields: {},
    requestId: null,
    isNetwork: false,
  }
}

// Request interceptor: attach JWT token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: normalize errors, handle auth centrally.
// A 401 clears the session and emits `auth:logout`; AuthContext reacts and
// ProtectedRoute redirects with returnTo — no hard window.location redirect
// that would lose the current route (P1-7).
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response
      const requestUrl = error.config?.url ?? ''
      const currentPath = window.location.pathname
      const onLoginScreen = currentPath.startsWith('/login')

      if (status === 401) {
        const exempt =
          EXEMPT_401.some((pattern) => pattern.test(requestUrl)) || onLoginScreen
        if (!exempt) {
          const hadSession = Boolean(localStorage.getItem('token'))
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.dispatchEvent(new Event('auth:logout'))
          if (hadSession) {
            toast.error('Your session expired. Please sign in again.')
          }
        }
      } else if (status === 422) {
        const detail = error.response.data?.detail
        if (Array.isArray(detail)) {
          detail.forEach((err) => toast.error(err.msg || 'Validation error'))
        } else if (typeof detail === 'string') {
          toast.error(detail)
        }
      } else if (status >= 500) {
        toast.error('Server error. Please try again later.')
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.')
    }

    return Promise.reject(error)
  }
)

export default client
