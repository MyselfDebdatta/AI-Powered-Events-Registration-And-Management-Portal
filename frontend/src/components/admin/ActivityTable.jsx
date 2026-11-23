import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'

/** ActivityTable — desk actions from `/attendance/event`; never fabricated. */
export function ActivityTable({ rows = [], loading = false }) {
  return (
    <Card variant="paper" padded className="p-3 h-[236px]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-900">Recent activity</div>
          <div className="mt-0.5 text-[8.5px] text-muted">Latest arrivals and desk actions</div>
        </div>
        <Link to="/admin/attendance" className="text-[8.5px] font-semibold text-ink-900 underline underline-offset-2">
          View all →
        </Link>
      </div>
      <div className="h-full overflow-y-auto">
        <Table
          columns={[
            { key: 'time', label: 'Time', primary: true },
            { key: 'participant', label: 'Participant' },
            { key: 'action', label: 'Action' },
            { key: 'desk', label: 'Desk', hideOnMobile: true },
            {
              key: 'status',
              label: 'Status',
              status: true,
              render: (value) => (
                <Badge
                  tone={value === 'Entry' || value === 'Issued' ? 'teal' : value === 'Review' ? 'amber' : 'grey'}
                  dot
                  className="text-[8.5px]"
                >
                  {value}
                </Badge>
              ),
            },
          ]}
          data={rows}
          loading={loading}
          emptyMessage="No activity yet"
          emptyBody="Desk actions appear here once the arrival desk records participants."
          showCount={false}
        />
      </div>
    </Card>
  )
}

export default ActivityTable
