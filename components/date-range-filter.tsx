'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function DateRangeFilter({
  defaultFrom = '',
  defaultTo   = '',
}: {
  defaultFrom?: string
  defaultTo?:   string
}) {
  const router   = useRouter()
  const pathname = usePathname()

  function applyDate(field: 'date_from' | 'date_to', value: string) {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(field, value)
    else params.delete(field)
    params.delete('page')
    router.replace(`${pathname}?${params}`)
  }

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px',
    fontSize: '13px',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input
        type="date"
        defaultValue={defaultFrom}
        onChange={e => applyDate('date_from', e.target.value)}
        title="From date"
        style={inputStyle}
      />
      <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>–</span>
      <input
        type="date"
        defaultValue={defaultTo}
        onChange={e => applyDate('date_to', e.target.value)}
        title="To date"
        style={inputStyle}
      />
    </div>
  )
}
