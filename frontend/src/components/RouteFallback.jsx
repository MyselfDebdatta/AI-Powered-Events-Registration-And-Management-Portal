import Skeleton from './ui/Skeleton'

/**
 * RouteFallback — layout-matched skeleton shown while a lazy route chunk
 * loads; never a spinner-only page (§10.2, §7.9).
 */
export default function RouteFallback() {
  return (
    <div className="container-page py-12" aria-busy="true">
      <span className="sr-only">Loading page…</span>
      <Skeleton variant="text" lines={1} className="mb-6 h-10 w-1/2" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Skeleton variant="card" className="md:col-span-2" />
        <Skeleton variant="card" />
      </div>
      <Skeleton variant="table" className="mt-8" rows={4} cols={4} />
    </div>
  )
}
