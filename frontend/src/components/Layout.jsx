import { Outlet, Link, useLocation } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-primary-dark text-white/60 text-center py-4 text-sm">
        © 2026 GeekAI — Odisha AI Symposium
      </footer>
    </div>
  )
}

