import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import client from '../../api/client'
import { Table } from '../../components/ui/Table'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react'

const CATEGORIES = ['STUDENT', 'RESEARCHER', 'PROFESSIONAL', 'SPEAKER', 'OTHER']
const CATEGORY_TONE = {
  STUDENT: 'teal',
  RESEARCHER: 'gold',
  PROFESSIONAL: 'neutral',
  SPEAKER: 'ink',
  OTHER: 'grey',
}
const LIMIT = 20

function fmtDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
  }).format(date)
}

/**
 * Participants — searchable register (Phase 4). Uses only GET /participants/;
 * Table renders a semantic table on desktop and cards at 360px.
 */
export default function Participants() {
  const navigate = useNavigate()
  // Filters live in query params so they survive refresh and are shareable (§12.2).
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const category = params.get('category') ?? ''
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0)

  const setFilter = (patch) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, String(value))
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin', 'participants', search, category, page],
    queryFn: () =>
      client
        .get('/participants/', {
          params: {
            search: search.trim() || undefined,
            category: category || undefined,
            skip: page * LIMIT,
            limit: LIMIT,
          },
        })
        .then((r) => r.data),
    retry: false,
  })

  const items = Array.isArray(data?.items) ? data.items : []
  const total = Number(data?.total ?? 0)
  const totalPages = Math.ceil(total / LIMIT)

  const columns = [
    { key: 'name', label: 'Participant', primary: true, render: (value, row) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink-900">{value}</p>
        <p className="truncate text-[10.5px] text-muted">#{row.id} · {row.email}</p>
      </div>
    ) },
    { key: 'institution', label: 'Institution', render: (v) => v || '—' },
    { key: 'category', label: 'Category', status: true, render: (v) => (
      <Badge tone={CATEGORY_TONE[v] ?? 'grey'} className="text-[9.5px]">{v ?? '—'}</Badge>
    ) },
    { key: 'registered_at', label: 'Registered', render: (v) => fmtDate(v) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Participants</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {total > 0 ? `${total} registered · page ${page + 1} of ${totalPages}` : 'Search the event register'}
          </p>
        </div>
        <Badge tone="neutral" icon={Users} className="text-[10px]">{total} total</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_190px]">
        <Input
          label="Search"
          icon={Search}
          placeholder="Name, email or participant ID (min 2 characters)"
          value={search}
          onChange={(e) => setFilter({ search: e.target.value, page: 0 })}
        />
        <Select
          label="Category"
          placeholder="All categories"
          value={category}
          onChange={(e) => setFilter({ category: e.target.value, page: 0 })}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
      </div>

      <section className="overflow-hidden rounded-md border border-border bg-paper shadow-sm">
        {error && (
          <div className="border-b border-border p-4">
            <p className="text-[12px] text-red-600">The register could not be loaded. Check the connection and retry.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-2">Retry</Button>
          </div>
        )}
        <Table
          columns={columns}
          data={items}
          loading={isLoading}
          onRowClick={(row) => navigate(`/admin/participants/${row.id}`)}
          emptyMessage="No participants found"
          emptyBody={search.trim() ? 'Try a different name, email or participant ID.' : 'No registrations have been recorded yet.'}
          showCount={false}
          rowActionLabel="View participant"
        />
        {isFetching && !isLoading && (
          <p className="border-t border-border px-3 py-1.5 text-right text-[10px] text-muted" role="status">Updating…</p>
        )}
      </section>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted">
            Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setFilter({ page: page - 1 })}>
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Prev
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setFilter({ page: page + 1 })}>
              Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
