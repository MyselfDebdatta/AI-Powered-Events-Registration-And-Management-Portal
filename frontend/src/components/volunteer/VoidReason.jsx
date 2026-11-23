import Select from '../ui/Select'

export const VOID_REASONS = [
  { value: 'DUPLICATE', label: 'Duplicate entry' },
  { value: 'WRONG_PARTICIPANT', label: 'Wrong participant marked' },
  { value: 'SCAN_ERROR', label: 'Scanner error' },
  { value: 'MANUAL_CORRECTION', label: 'Manual correction' },
  { value: 'OTHER', label: 'Other — noted in the audit log' },
]

/** RejectReason — the mandatory reason picker for destructive record actions. */
export function RejectReason({ value, onChange, options = VOID_REASONS, label = 'Reason' }) {
  return (
    <Select
      label={label}
      placeholder="Choose a reason…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      helper="The reason is written to the audit log with the record."
      required
    />
  )
}

export default RejectReason
