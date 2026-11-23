import { useParams, Link } from 'react-router-dom'
import { useImport } from '../../hooks/useImports'
import flags from '../../content/flags'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { WaitingForBackend } from '../../components/volunteer/WaitingForBackend'
import { ArrowLeft } from 'lucide-react'

/** Import detail — flag-gated; the backend has no imports endpoint yet. */
export default function ImportDetail() {
  const { id } = useParams()
  const { data, isLoading } = useImport(id)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button variant="secondary" size="sm" asChild>
          <Link to="/admin/imports"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Imports</Link>
        </Button>
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Import #{id}</h2>
      </div>
      {!flags.importsV2 ? (
        <WaitingForBackend title="Import detail is waiting for the hub" endpoints={[`GET /api/admin/imports/${id}`]} />
      ) : (
        <Card variant="paper" padded className="p-4">
          {isLoading ? (
            <p className="text-[11px] text-muted">Loading import…</p>
          ) : data ? (
            <pre className="overflow-x-auto text-[11px]">{JSON.stringify(data, null, 2)}</pre>
          ) : (
            <p className="text-[11px] text-muted">No import with that ID was found.</p>
          )}
        </Card>
      )}
    </div>
  )
}
