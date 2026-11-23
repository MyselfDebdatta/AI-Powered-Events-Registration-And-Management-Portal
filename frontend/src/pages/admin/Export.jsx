import { useState } from 'react'
import client from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Download, FileSpreadsheet, Users, ClipboardCheck } from 'lucide-react'
import toast from 'react-hot-toast'

/** Export — CSV/Excel downloads from the live export endpoints. */
export default function Export() {
  const [loading, setLoading] = useState({})

  const download = async (url, filename, key) => {
    setLoading((prev) => ({ ...prev, [key]: true }))
    try {
      const response = await client.get(url, { responseType: 'blob' })
      const objectUrl = URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      toast.success(`${filename} downloaded`)
    } catch {
      toast.error('The export could not be downloaded. Check the hub connection.')
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Export data</h2>
        <p className="mt-0.5 text-[11px] text-muted">Download the register and attendance log for reconciliation.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card variant="paper" padded className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-semibold text-ink-900">Participants</h3>
              <p className="mt-1 text-[11px] text-muted">All registered participants and their details.</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-sm bg-sand-100 text-ink-700">
              <Users className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={loading.participants}
            onClick={() => download('/admin/export/participants', 'participants.csv', 'participants')}
            className="mt-4"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download CSV
          </Button>
        </Card>

        <Card variant="paper" padded className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-semibold text-ink-900">Attendance records</h3>
              <p className="mt-1 text-[11px] text-muted">Event check-ins and session attendance.</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-sm bg-sand-100 text-ink-700">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" loading={loading.attendanceCsv} onClick={() => download('/admin/export/attendance?format=csv', 'attendance.csv', 'attendanceCsv')}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV
            </Button>
            <Button variant="secondary" size="sm" loading={loading.attendanceExcel} onClick={() => download('/admin/export/attendance?format=excel', 'attendance.xlsx', 'attendanceExcel')}>
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" /> Excel
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
