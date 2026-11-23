import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { KonarkMark } from './public/KonarkMark'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="bg-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <KonarkMark className="h-6 w-6 text-accent" />
            GeekAI
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/register" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
              Register
            </Link>
            {isAuthenticated ? (
              <>
                {user?.role === 'ADMIN' && (
                  <Link to="/admin" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                    Admin
                  </Link>
                )}
                <Link to="/volunteer" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                  Volunteer
                </Link>
                <span className="text-accent text-sm">{user?.name}</span>
                <button onClick={handleLogout} className="text-white/60 hover:text-white transition-colors cursor-pointer">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link to="/login" className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-white cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-primary-dark px-4 pb-4 space-y-2">
          <Link to="/register" className="block text-white/80 hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>
            Register
          </Link>
          {isAuthenticated ? (
            <>
              {user?.role === 'ADMIN' && (
                <Link to="/admin" className="block text-white/80 hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>
                  Admin Dashboard
                </Link>
              )}
              <Link to="/volunteer" className="block text-white/80 hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>
                Volunteer
              </Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="block text-white/60 hover:text-white py-2 text-sm cursor-pointer">
                Logout ({user?.name})
              </button>
            </>
          ) : (
            <Link to="/login" className="block text-accent hover:text-accent-light py-2 text-sm" onClick={() => setMenuOpen(false)}>
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}

