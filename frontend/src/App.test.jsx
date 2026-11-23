import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('App routes', () => {
  it('renders the home page', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy()
  })

  it('shows a real 404 page for unknown routes', async () => {
    renderAt('/this-route-does-not-exist')
    expect(await screen.findByText("This page doesn't exist")).toBeTruthy()
    // no automatic redirect back home
    expect(window.location.pathname).toBe('/')
  })

  it('renders the staff sign-in page', async () => {
    renderAt('/login')
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeTruthy()
  })
})
