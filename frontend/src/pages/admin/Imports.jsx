import { Link } from 'react-router-dom'
import { useImports } from '../../hooks/useImports'
import flags from '../../content/flags'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { WaitingForBackend } from '../../components/volunteer/WaitingForBackend'
import { Upload } from 'lucide-react'

/** Imports list — flag-gated; the backend has no imports endpoint yet. */
export default function Imports() {
  const { data, isLoading } = useImports()
  const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Imports</h2>
        <p className="mt-0.5 text-[11px] text-muted">Participant import batches and their results.</p>
      </div>
      {!flags.importsV2 ? (
        <WaitingForBackend title="Imports are waiting for the hub" endpoints={['POST /api/admin/imports', 'GET /api/admin/imports']} />
      ) : (
        <Card variant="paper" padded className="p-3">
          <Table
            columns={[
              { key: 'id', label: 'ID', primary: true },
              { key: 'filename', label: 'File', render: (v, row) => (
                <Link to={`/admin/imports/${row.id}`} className="font-medium text-ink-900 underline underline-offset-2">{v || `#${row.id}`}</Link>
              ) },
              { key: 'created_at', label: 'Imported', render: (v) => v || '—' },
              { key: 'status', label: 'Status', render: (v) => v || '—' },
            ]}
            data={rows}
            loading={isLoading}
            emptyMessage="No imports recorded"
            emptyBody="Imports appear here once the hub accepts them."
            showCount={false}
          />
        </Card>
      )}
      <p className="flex items-center gap-1.5 text-[10.5px] text-muted">
        <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Registered participants can be imported when the service is live.
      </p>
    </div>
  )
}
