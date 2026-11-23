import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../../api/client'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import { Dialog } from '../../components/ui/Dialog'
import { Banner } from '../../components/ui/Banner'
import { Badge } from '../../components/ui/Badge'
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { name: '', description: '', start_time: '', end_time: '', location: '' }

function fmt(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

/**
 * Sessions — list/create/edit/delete against the live `/sessions/` contract.
 * Destructive actions require confirmation and state the consequence (§5.3).
 */
export default function Sessions() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [confirming, setConfirming] = useState(null)
  const [error, setError] = useState(null)

  const { data, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => client.get('/sessions/').then((r) => r.data),
    retry: false,
  })
  const sessions = Array.isArray(data) ? data : []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] })

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? client.put(`/sessions/${editing.id}`, payload)
        : client.post('/sessions/', payload),
    onSuccess: () => {
      invalidate()
      closeForm()
      toast.success(editing ? 'Session updated' : 'Session created')
    },
    onError: (err) => setError(err.response?.data?.detail || 'The session could not be saved.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/sessions/${id}`),
    onSuccess: () => {
      invalidate()
      setConfirming(null)
      toast.success('Session deleted')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'The session could not be deleted.'),
  })

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setForm(EMPTY)
    setError(null)
  }

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(null); setFormOpen(true) }
  const openEdit = (session) => {
    setEditing(session)
    setForm({
      name: session.name ?? '',
      description: session.description ?? '',
      start_time: session.start_time?.slice(0, 16) ?? '',
      end_time: session.end_time?.slice(0, 16) ?? '',
      location: session.location ?? '',
    })
    setError(null)
    setFormOpen(true)
  }

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    saveMutation.mutate({
      name: form.name.trim(),
      description: form.description.trim() || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location.trim() || null,
    })
  }

  const columns = [
    { key: 'name', label: 'Session', primary: true, render: (v, row) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink-900">{v}</p>
        <p className="truncate text-[10px] text-muted">{row.location || 'No location recorded'}</p>
      </div>
    ) },
    { key: 'start_time', label: 'Starts', render: (v) => fmt(v) },
    { key: 'end_time', label: 'Ends', render: (v) => fmt(v) },
    { key: 'capacity', label: 'Capacity', render: (v) => v ? <Badge tone="neutral">{v}</Badge> : '—' },
    { key: 'actions', label: 'Actions', actions: true, render: (_, row) => (
      <div className="flex gap-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openEdit(row) }}
          aria-label={`Edit ${row.name}`}
          className="grid h-9 w-9 place-items-center rounded-sm text-muted hover:bg-sand-100 hover:text-ink-900"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setConfirming(row) }}
          aria-label={`Delete ${row.name}`}
          className="grid h-9 w-9 place-items-center rounded-sm text-muted hover:bg-red-100 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    ) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Sessions</h2>
          <p className="mt-0.5 text-[11px] text-muted">Timetable and room capacity for the event.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New session
        </Button>
      </div>

      {(queryError || error) && !formOpen && (
        <Banner tone="error" title="Sessions could not be loaded" action={
          <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
        }>
          Check the hub connection and retry. No changes were made.
        </Banner>
      )}

      <section className="overflow-hidden rounded-md border border-border bg-paper shadow-sm">
        <Table
          columns={columns}
          data={sessions}
          loading={isLoading}
          emptyMessage="No sessions yet"
          emptyBody="Create a session to track attendance and room capacity."
          showCount={false}
        />
      </section>

      <Dialog
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit session' : 'New session'}
        description="Times are shown in the event's local timezone."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button type="submit" form="session-form" loading={saveMutation.isPending}>
              {editing ? 'Update session' : 'Create session'}
            </Button>
          </>
        }
      >
        <form id="session-form" onSubmit={submit} className="space-y-3">
          {error && <Banner tone="error" title="Could not save">{error}</Banner>}
          <Input label="Session name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Starts" type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <Input label="Ends" type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </form>
      </Dialog>

      <Dialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title="Delete this session?"
        description="This cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>Keep session</Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(confirming.id)}>
              Delete session
            </Button>
          </>
        }
      >
        <p className="flex items-start gap-2 text-[12px] text-slate-700">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          {confirming?.name} will be removed. Attendance records already marked for it stay in the log.
        </p>
      </Dialog>
    </div>
  )
}
