/**
 * ArrivalsChart — one hand-built SVG area line (recharts is not in v1).
 * Values come from the hub; with no endpoint the caller renders an empty state.
 */
export function ArrivalsChart({ values = [], expected = null, label = 'Arrived', height = 210 }) {
  const width = 760
  const pad = 44
  const band = height - 44
  const allValues = expected ? [...values, ...expected] : values
  const max = Math.max(...allValues, 1)
  const xStep = (width - pad * 2) / Math.max(values.length - 1, 1)

  const y = (value) => pad + band - (value / max) * band
  const xs = values.map((_, i) => pad + i * xStep)
  const ys = values.map((v) => y(v))

  const areaPath = [
    `M${pad} ${height - pad}`,
    ...xs.map((x, i) => `L${x} ${ys[i]}`),
    `L${xs[xs.length - 1] ?? pad} ${height - pad}`,
    'Z',
  ].join(' ')

  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x} ${ys[i]}`).join(' ')
  const expectedPath =
    expected && expected.length === values.length
      ? expected.map((v, i) => `${i === 0 ? 'M' : 'L'}${pad + i * xStep} ${y(v)}`).join(' ')
      : null

  const latest = values[values.length - 1] ?? 0
  const latestX = xs[xs.length - 1] ?? pad
  const latestY = ys[ys.length - 1] ?? height - pad

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-label={`${label} trend`}
    >
      <defs>
        <linearGradient id="arrivals-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0E7C7B" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#0E7C7B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="rgba(11,31,58,0.10)" strokeWidth={1}>
        {[20, 60, 100, 140, 180].map((gy) => (
          <line key={gy} x1={pad} y1={y(gy)} x2={width - pad} y2={y(gy)} />
        ))}
      </g>
      {expectedPath && (
        <path d={expectedPath} fill="none" stroke="#C9A227" strokeWidth={1.4} strokeDasharray="4 4" />
      )}
      <path d={areaPath} fill="url(#arrivals-area)" />
      <path d={linePath} fill="none" stroke="#0E7C7B" strokeWidth={2.2} strokeLinecap="round" />
      <g fill="#8B95A3" fontSize="9" fontFamily="system-ui, sans-serif">
        <text x={0} y={height - pad + 14}>0</text>
        <text x={pad} y={height + 24}>09:00</text>
        <text x={width - pad} y={height + 24} textAnchor="end">17:00</text>
      </g>
      <line
        x1={latestX} y1={latestY} x2={latestX} y2={height - pad}
        stroke="rgba(11,31,58,0.16)" strokeWidth={1} strokeDasharray="3 3"
      />
      <circle cx={latestX} cy={latestY} r={4} fill="#0E7C7B" stroke="#fff" strokeWidth={2} />
      {values.length > 0 && (
        <g transform={`translate(${Math.max(latestX - 44, pad)} ${Math.min(latestY - 30, 36)})`}>
          <rect width="96" height="25" rx={4} fill="#0B1F3A" />
          <text x={8} y={16} fill="#F7F3EA" fontSize="9" fontFamily="system-ui, sans-serif">
            {latest} by 14:00
          </text>
        </g>
      )}
    </svg>
  )
}

export default ArrivalsChart
