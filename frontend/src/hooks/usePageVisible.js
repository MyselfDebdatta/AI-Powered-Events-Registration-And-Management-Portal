import { useEffect, useState } from 'react'

/** usePageVisible — true while the tab is foregrounded (§12.5 polling pause). */
export default function usePageVisible() {
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden
  )

  useEffect(() => {
    const sync = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    window.addEventListener('blur', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
      window.removeEventListener('blur', sync)
    }
  }, [])

  return visible
}
