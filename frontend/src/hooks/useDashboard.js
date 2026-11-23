import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'

/**
 * useDashboard — the live admin overview (Phase 4, mockup 07).
 * Only `/api/admin/dashboard` and `/api/sessions/` are used; everything else is
 * derived locally so no number is invented and no endpoint is guessed.
 */
export const EMPTY_STATS = {
  total_participants: 0,
  total_sessions: 0,
  total_attendance_records: 0,
  event_checkins: 0,
  participants_by_category: {},
  recent_registrations: [],
}

export function pct(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

export default function useDashboard() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => client.get('/admin/dashboard').then((r) => r.data),
    retry: false,
  })

  const sessionsQuery = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => client.get('/sessions/').then((r) => r.data),
    retry: false,
  })

  const stats = useMemo(
    () => ({ ...EMPTY_STATS, ...(statsQuery.data || {}) }),
    [statsQuery.data]
  )
  const sessions = Array.isArray(sessionsQuery.data) ? sessionsQuery.data : []

  const registered = stats.total_participants
  const arrived = stats.event_checkins
  const attendanceRecords = stats.total_attendance_records
  const notArrived = Math.max(0, registered - arrived)
  const arrivalRate = pct(arrived, registered)

  const recentArrivals = useMemo(
    () =>
      (stats.recent_registrations || []).filter(
        (p) => Array.isArray(p.attendances) && p.attendances.some((a) => a.session_id == null)
      ),
    [stats.recent_registrations]
  )

  const funnelRows = useMemo(
    () => [
      { label: 'Registered', value: registered, share: pct(registered, registered), tone: 'ink' },
      { label: 'Arrived', value: arrived, share: arrivalRate, tone: 'gold' },
      {
        label: 'Checked in',
        value: attendanceRecords,
        share: pct(attendanceRecords, registered),
        tone: 'teal',
      },
    ],
    [registered, arrived, attendanceRecords, arrivalRate]
  )

  return {
    stats,
    sessions,
    registered,
    arrived,
    attendanceRecords,
    notArrived,
    arrivalRate,
    recentArrivals,
    funnelRows,
    isLoading: statsQuery.isLoading || sessionsQuery.isLoading,
    statsError: statsQuery.error,
    refetch: () => {
      statsQuery.refetch()
      sessionsQuery.refetch()
    },
  }
}
