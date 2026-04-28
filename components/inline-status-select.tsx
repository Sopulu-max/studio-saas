'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSessionStatus } from '@/app/actions/sessions'
import { getStatusConfig } from '@/lib/studio-config'
import { useStudioConfig } from '@/components/studio-config-provider'

/**
 * Drop-in inline status picker for any session row.
 * Reads ALL statuses (including terminal + cancellation) from StudioConfigProvider.
 * Color updates optimistically on selection; saves in the background.
 */
export default function InlineStatusSelect({
  sessionId,
  currentStatus,
  size = 'sm',
}: {
  sessionId:     string
  currentStatus: string
  /** 'sm' = compact list row  |  'md' = slightly larger action row */
  size?: 'sm' | 'md'
}) {
  const config = useStudioConfig()
  const router = useRouter()
  const [status, setStatus]   = useState(currentStatus)
  const [isPending, startTransition] = useTransition()

  const current = getStatusConfig(config, status)
  // All statuses sorted by order (buildStudioConfig already sorts, but be safe)
  const allStatuses = [...config.bookingStatuses].sort((a, b) => a.order - b.order)

  function handleChange(next: string) {
    setStatus(next)   // optimistic colour flip
    startTransition(async () => {
      await updateSessionStatus(sessionId, next)
      router.refresh()
    })
  }

  const fs   = size === 'md' ? '12px' : '11px'
  const px   = size === 'md' ? '3px 8px' : '2px 6px'
  const pr   = size === 'md' ? '22px' : '18px'

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={e => handleChange(e.target.value)}
      style={{
        fontSize: fs,
        padding: px,
        paddingRight: pr,
        borderRadius: '20px',
        border: `1px solid ${current.color_fg}55`,
        background: current.color_bg,
        color: current.color_fg,
        fontWeight: 500,
        cursor: isPending ? 'wait' : 'pointer',
        flexShrink: 0,
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='${encodeURIComponent(current.color_fg)}'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 5px center',
        backgroundSize: '8px',
        opacity: isPending ? 0.55 : 1,
        transition: 'opacity .15s, background .1s, color .1s',
      }}
    >
      {allStatuses.map(s => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  )
}
