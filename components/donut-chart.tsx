// Server-compatible pure SVG donut chart — no client hooks needed

type Segment = { label: string; value: number; color: string }

export default function DonutChart({
  segments,
  size = 180,
  title,
}: {
  segments:  Segment[]
  size?:     number
  title?:    string
}) {
  const total       = segments.reduce((s, seg) => s + seg.value, 0)
  const r           = 38
  const cx = 50, cy = 50
  const circ        = 2 * Math.PI * r

  let offset = 0
  const arcs = segments.map(seg => {
    const dash = total > 0 ? (seg.value / total) * circ : 0
    const arc  = { ...seg, dash, offset }
    offset += dash
    return arc
  })

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth="16" />
        ) : (
          arcs.map((arc, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={arc.color} strokeWidth="16"
              strokeDasharray={`${arc.dash} ${circ}`}
              strokeDashoffset={-arc.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          ))
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)">{total}</text>
        {title && <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fill="var(--text-3)">{title}</text>}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '180px' }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '11px', height: '11px', borderRadius: '3px', background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'var(--text-2)', flex: 1 }}>{seg.label}</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{seg.value}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)', minWidth: '34px', textAlign: 'right' }}>
              {total > 0 ? `${Math.round((seg.value / total) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
