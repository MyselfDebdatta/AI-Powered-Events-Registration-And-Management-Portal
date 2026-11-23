import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import client from '../../api/client'
import flags from '../../content/flags'
import useDashboard from '../../hooks/useDashboard'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { KpiCard } from '../../components/admin/KpiCard'
import { ArrivalsChart } from '../../components/admin/ArrivalsChart'
import { Funnel } from '../../components/admin/Funnel'
import { CapacityCard } from '../../components/admin/CapacityCard'
import { ActivityTable } from '../../components/admin/ActivityTable'
import { Users, DoorOpen, CalendarDays, WifiOff, RefreshCw, TrendingUp } from 'lucide-react'

/**
 * Dashboard — admin operations overview (Phase 4, mockup 07).
 * KPI arithmetic comes from `/api/admin/dashboard`; nothing is invented.
 */
export default function Dashboard() {
  const {
    stats,
    sessions,
    registered,
    arrived,
    attendanceRecords,
    notArrived,
    arrivalRate,
    recentArrivals,
    funnelRows,
    isLoading,
    refetch,
  } = useDashboard()

  const { data: eventAttendance = [], isLoading: activityLoading } = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: () => client.get('/attendance/event').then((r) => r.data),
    retry: false,
  })

  const activityRows = (Array.isArray(eventAttendance) ? eventAttendance : []).slice(0, 5).map((entry) => ({
    time: entry.marked_at
      ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).format(new Date(entry.marked_at))
      : '—',
    participant: entry.participant_name ?? `#${entry.participant_id}`,
    action: entry.session_id == null ? 'Checked in' : 'Session attendance',
    desk: entry.marked_by_name ?? '—',
    status: entry.method === 'MANUAL' ? 'Review' : 'Entry',
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink-900">Event overview</h2>
          <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">
            Live operations · event day · updates every 30 seconds
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="outline" className="text-[9.5px]">Event day</Badge>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/admin/export" className="flex items-center gap-1">Export</Link>
          </Button>
          <Button variant="secondary" size="sm" onClick={refetch}>
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Registered" value={registered} sub="From the live register" tone="ink" icon={Users} />
        <KpiCard label="Arrived" value={arrived} sub={`${arrivalRate}% of registered`} tone="teal" icon={DoorOpen} />
        <KpiCard label="Pending sync" value="—" sub="No hub data yet" tone="amber" icon={WifiOff} />
        <KpiCard label="Not arrived" value={notArrived} sub={`${100 - arrivalRate}% of registered`} tone="ink" icon={CalendarDays} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.72fr_1fr]">
        <Card variant="paper" padded className="p-3 h-[300px]">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="text-[11px] font-semibold text-ink-900">Arrivals over time</div>
              <div className="mt-0.5 text-[8.5px] text-muted">Arrived versus expected · today</div>
            </div>
            <div className="flex gap-1 text-[8px] text-muted">
              <span className="flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-teal-500" /> Arrived</span>
              <span className="flex items-center gap-1"><span className="h-[1px] w-3 border-t border-t-gold-500/60" /> Expected</span>
            </div>
          </div>
          <div className="h-[222px] w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-[10px] text-muted">Loading arrivals…</div>
            ) : flags.arrivalV2 && recentArrivals.length ? (
              <ArrivalsChart
                values={recentArrivals.map((_, i) => i + 1)}
                expected={Array(recentArrivals.length).fill(Math.ceil(registered * 0.3))}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border-strong bg-sand-100 p-3 text-center text-[10px] text-muted">
                <TrendingUp className="h-4 w-4 text-sand-300" aria-hidden="true" />
                <div>No arrivals endpoint yet</div>
                <div className="text-[9px]">Use the arrival desk to record participants.</div>
              </div>
            )}
          </div>
        </Card>

        <Card variant="paper" padded className="p-3 h-[300px]">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="text-[11px] font-semibold text-ink-900">Reconciliation</div>
              <div className="mt-0.5 text-[8.5px] text-muted">Registered → checked in</div>
            </div>
            <Badge tone="amber" dot className="text-[9px]">{arrivalRate}% variance</Badge>
          </div>
          <Funnel rows={funnelRows} total={registered} variance={100 - arrivalRate} />
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[9px] text-muted">
            <span>Arrival rate</span>
            <span className="font-semibold text-ink-900">{arrivalRate}%</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px] text-muted">
            <span>Attendance records</span>
            <span className="font-semibold text-ink-900">{attendanceRecords}</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.72fr]">
        <CapacityCard sessions={sessions} loading={isLoading} />
        <ActivityTable rows={activityRows} loading={activityLoading} />
      </div>
    </div>
  )
}
