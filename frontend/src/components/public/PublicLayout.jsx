import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import PublicHeader from './PublicHeader'
import PublicFooter from './PublicFooter'

/** Scroll to top on route change (public pages only start at the top). */
function useScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
}

/**
 * PublicLayout — the public shell: top strip, masthead, main region and the
 * ink footer (§6.1 route map wraps every public page in this shell).
 * `min-h-dvh` keeps the footer pinned on short viewports.
 */
export function PublicLayout() {
  useScrollToTop()

  return (
    <div className="flex min-h-dvh flex-col bg-ivory-100">
      <PublicHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

export default PublicLayout
