'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useStudioConfig } from '@/components/studio-config-provider'
import { getSessionTypeConfig, getStatusConfig } from '@/lib/studio-config'
import { bulkUpdateSessionStatus } from '@/app/actions/sessions'
import { sessionName } from '@/lib/session-title'

type SessionRow = {
  booking_id:    string
  booking_ref?:  number | null
  session_type?: string | null
  session_date?: string | null
  status:        string
  clients?:      { full_name?: string | null; email?: string | null } | null
  packages?:     { name?: string | null } | null
}

export default function BulkSessionList({ sessions }: { sessions: SessionRow[] }) {
  const router  = useRouter()
  const config  = useStudioConfig()
  const [selected, setSelected]      = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus]  = useState('')
  const [isPending, startTransition] = useTransition()

  function toggleAll() {
    if (selected.size === sessions.length) setSelected(new Set())
    else setSelected(new Set(sessions.map(s => s.booking_id)))
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleBulkUpdate() {
    if (!bulkStatus) { toast.error('Pick a status first'); return }
    startTransition(async () => {
      const { error, updated } = await bulkUpdateSessionStatus([...selected], bulkStatus) as { error: string | null; updated?: number }
      if (error) { toast.error(error); return }
      toast.success(`${updated} session${updated !== 1 ? 's' : ''} updated`)
      setSelected(new Set())
      setBulkStatus('')
      router.refresh()
    })
  }

  const allChecked  = sessions.length > 0 && selected.size === sessions.length
  const someChecked = selected.size > 0

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1.2fr 1.5fr 1fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500', alignItems: 'center' }}>
          <input type="checkbox" checked={allChecked} onChange={toggleAll}
            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--text)' }} />
          <span>Name</span><span>Client</span><span>Type</span><span>Date</span><span>Package</span><span>Status</span>
        </div>

        {/* Rows */}
        {sessions.map((s, i) => {
          const typeCfg   = getSessionTypeConfig(config, s.session_type)
          const statusCfg = getStatusConfig(config, s.status)
          const isSelected = selected.has(s.booking_id)
          const name = sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)
          return (
            <div key={s.booking_id} style={{
              display: 'grid', gridTemplateColumns: '36px 1.2fr 1.5fr 1fr 1fr 1fr 1fr',
              padding: '1rem 1.25rem', alignItems: 'center',
              borderBottom: i < sessions.length - 1 ? '1px solid var(--line-inner)' : 'none',
              background: isSelected ? 'var(--active)' : 'transparent',
              transition: 'background 0.1s',
            }}>
              <input type="checkbox" checked={isSelected} onChange={() => toggle(s.booking_id)}
                style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--text)' }} />

              {/* Name column — links to session */}
              <Link href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', margin: 0, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.01em' }}>
                  {name}
                </p>
              </Link>

              {/* Client column */}
              <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>
                {s.clients?.full_name ?? '—'}
              </p>

              <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: typeCfg.color_bg, color: typeCfg.color_fg, fontWeight: '500' }}>
                {typeCfg.label}
              </span>
              <p style={{ fontSize: '13px', margin: 0 }}>
                {s.session_date ? new Date(s.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{s.packages?.name ?? '—'}</p>
              <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: statusCfg.color_bg, color: statusCfg.color_fg, fontWeight: '500' }}>
                {statusCfg.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Floating bulk action bar */}
      {someChecked && (
        <div style={{
          position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--text)', color: 'var(--surface)', borderRadius: '12px',
          padding: '10px 16px', boxShadow: '0 8px 24px rgba(0,0,0,.25)',
          minWidth: '340px', maxWidth: 'calc(100vw - 32px)',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, padding: '0 4px', fontSize: '18px', lineHeight: 1 }}>×</button>
          <div style={{ flex: 1 }} />
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            style={{ fontSize: '13px', padding: '5px 10px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)', color: 'inherit', cursor: 'pointer', outline: 'none' }}>
            <option value="">Move to status…</option>
            {config.bookingStatuses.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
          </select>
          <button onClick={handleBulkUpdate} disabled={isPending || !bulkStatus}
            style={{ fontSize: '13px', padding: '5px 14px', borderRadius: '7px', background: 'var(--surface)', color: 'var(--text)', border: 'none', cursor: 'pointer', fontWeight: '500', opacity: isPending || !bulkStatus ? 0.5 : 1, whiteSpace: 'nowrap' }}>
            {isPending ? 'Updating…' : 'Apply'}
          </button>
        </div>
      )}
    </div>
  )
}
