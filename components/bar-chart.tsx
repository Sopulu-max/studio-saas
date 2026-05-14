// Server-compatible pure SVG vertical bar chart — no client hooks needed

type Bar = { label: string; value: number }

export default function BarChart({
  data,
  color       = '#c9a96e',
  valuePrefix = '',
  valueSuffix = '',
  height      = 140,
}: {
  data:         Bar[]
  color?:       string
  valuePrefix?: string
  valueSuffix?: string
  height?:      number
}) {
  if (!data.length) return null

  const max    = Math.max(...data.map(d => d.value), 1)
  const barH   = height - 28       // reserve 28px for label at bottom
  const n      = data.length
  const W      = Math.max(n * 52, 240)
  const barW   = Math.floor((W / n) * 0.55)
  const step   = W / n
  const offset = (step - barW) / 2

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ maxWidth: `${W}px`, display: 'block' }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(frac => {
          const y = barH - frac * barH
          return (
            <line key={frac} x1={0} y1={y} x2={W} y2={y}
              stroke="var(--line)" strokeWidth="0.5" strokeDasharray="3 3" />
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const h  = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * barH)
          const x  = i * step + offset
          const y  = barH - h

          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={h} rx="3" fill={color} opacity="0.9" />
              {d.value > 0 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--text-2)">
                  {valuePrefix}{d.value > 999 ? `${(d.value / 1000).toFixed(1)}k` : d.value}{valueSuffix}
                </text>
              )}
              <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize="8.5" fill="var(--text-3)">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
