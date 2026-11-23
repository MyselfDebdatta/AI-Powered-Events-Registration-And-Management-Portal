import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../../api/client'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Dialog } from '../../components/ui/Dialog'
import { Badge } from '../../components/ui/Badge'
import { KpiCard } from '../../components/admin/KpiCard'
import { UserPlus, UserCheck, UserX, Trash2, Search, ShieldCheck, Users, ClipboardCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { name: '', email: '', password: '', confirmPassword: '' }

function fmt(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

/** Volunteers — staff accounts against the live /admin/volunteers contract. */
export default function Volunteers() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [formError, setFormError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'volunteers'],
    queryFn: () => client.get('/admin/volunteers').then((r) => r.data),
    retry: false,
  })
  const volunteers = Array.isArray(data) ? data : []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'volunteers'] })

  const createMutation = useMutation({
    mutationFn: (payload) => client.post('/admin/volunteers', payload),
    onSuccess: (res) => {
      invalidate()
      closeForm()
      toast.success(`${res.data.name} can now log in.`)
    },
    onError: (err) => setFormError(err.response?.data?.detail || 'The volunteer could not be added.'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => client.patch(`/admin/volunteers/${id}/toggle-status`),
    onSuccess: (res) => {
      invalidate()
      toast.success(`${res.data.name} is now ${res.data.is_active ? 'active' : 'inactive'}.`)
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'The status could not be changed.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/admin/volunteers/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Volunteer removed.') },
    onError: (err) => toast.error(err.response?.data?.detail || 'The volunteer could not be removed.'),
  })

  const closeForm = () => { setFormOpen(false); setForm(EMPTY); setFormError(null) }

  const submit = (e) => {
    e.preventDefault()
    setFormError(null)
    if (form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return }
    if (form.password !== form.confirmPassword) { setFormError('Passwords do not match.'); return }
    createMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    })
  }

  const filtered = volunteers.filter((v) => {
    const q = search.trim().toLowerCase()
    return !q || v.name?.toLowerCase().includes(q) || v.email?.toLowerCase().includes(q)
  })
  const active = volunteers.filter((v) => v.is_active).length
  const totalMarked = volunteers.reduce((sum, v) => sum + (v.attendance_count || 0), 0)

  const columns = [
    { key: 'name', label: 'Volunteer', primary: true, render: (v, row) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink-900">{v}</p>
        <p className="truncate text-[10px] text-muted">{row.email}</p>
      </div>
    ) },
    { key: 'is_active', label: 'Status', status: true, render: (v) => (
      <Badge tone={v ? 'teal' : 'grey'} dot className="text-[9.5px]">{v ? 'Active' : 'Inactive'}</Badge>
    ) },
    { key: 'attendance_count', label: 'Check-ins', render: (v) => v || 0 },
    { key: 'created_at', label: 'Added', render: (v) => fmt(v) },
    { key: 'actions', label: 'Actions', actions: true, render: (_, row) => (
      <div className="flex gap-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(row.id) }}
          aria-label={row.is_active ? `Deactivate ${row.name}` : `Activate ${row.name}`}
          className="grid h-9 w-9 place-items-center rounded-sm text-muted hover:bg-sand-100 hover:text-ink-900"
        >
          {row.is_active ? <UserX className="h-3.5 w-3.5" aria-hidden="true" /> : <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDeleting(row) }}
          aria-label={`Remove ${row.name}`}
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
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Volunteers</h2>
          <p className="mt-0.5 text-[11px] text-muted">Desk accounts and their access status.</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Add volunteer
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <KpiCard label="Volunteers" value={volunteers.length} tone="ink" icon={Users} />
        <KpiCard label="Active" value={active} tone="teal" icon={ShieldCheck} />
        <KpiCard label="Check-ins marked" value={totalMarked} tone="ink" icon={ClipboardCheck} />
      </div>

      <Input label="Search volunteers" icon={Search} placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} />

      {error && (
        <div className="rounded-sm border border-red-600/25 bg-red-100 px-3 py-2 text-[11.5px] text-red-600">
          Volunteers could not be loaded. <button type="button" onClick={() => refetch()} className="font-semibold underline">Retry</button>
        </div>
      )}

      <section className="overflow-hidden rounded-md border border-border bg-paper shadow-sm">
        <Table columns={columns} data={filtered} loading={isLoading} emptyMessage="No volunteers" emptyBody="Add a volunteer to give them desk access." showCount={false} />
      </section>

      <Dialog
        open={formOpen}
        onClose={closeForm}
        title="Add a volunteer"
        description="They receive these credentials and can log in at /volunteer/login."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button type="submit" form="volunteer-form" loading={createMutation.isPending}>Add volunteer</Button>
          </>
        }
      >
        <form id="volunteer-form" onSubmit={submit} className="space-y-3">
          {formError && <p className="rounded-sm bg-red-100 px-3 py-2 text-[11.5px] text-red-600">{formError}</p>}
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Input label="Confirm password" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Remove this volunteer?"
        description="Their desk access ends immediately."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Keep volunteer</Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleting.id)}>Remove</Button>
          </>
        }
      >
        <p className="text-[12px] text-slate-700">{deleting?.name} will no longer be able to sign in. Attendance records they marked stay in the log.</p>
      </Dialog>
    </div>
  )
}
