'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { sessionName } from '@/lib/session-title'

// ─── Types ────────────────────────────────────────────────────────────────────

type Style = { label: string; color_bg: string; color_fg: string }

type Session = {
  booking_id:    string
  booking_ref?:  number | null
  session_date?: string | null
  session_type?: string | null
  shoot_type?:   string | null
  status:        string
  clients?:      { full_name?: string | null } | null
  packages?:     { name?: string | null } | null
}

type Staff = {
  staff_id:  string
  full_name: string
  role:      string | null
  roles:     string[] | null
  checkin:   { checked_in_at: string; checked_out_at: string | null } | null
}

export type DashboardProps = {
  studioName:       string
  studioSlug:       string | null
  siteUrl:          string
  todayLabel:       string
  pendingCount:     number
  pendingStatus:    string
  pendingStyle:     Style
  overdueCount:     number
  todaySessions:    Session[]
  next3Sessions:    Session[]
  pipelineSessions: Session[]
  activeStatuses:   (Style & { value: string })[]
  staffToday:       Staff[]
  statusStyles:     Record<string, Style>
  sessionTypeStyles:Record<string, Style>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })
}
function styleFor(map: Record<string, Style>, key: string | null | undefined): Style {
  return map[key ?? ''] ?? { label: key ?? '—', color_bg: '#f0f0f0', color_fg: '#555' }
}

const LATE_H = 8, LATE_M = 30
function isLate(iso: string) {
  const d = new Date(iso)
  return d.getHours() > LATE_H || (d.getHours() === LATE_H && d.getMinutes() > LATE_M)
}

// ─── Block layout ─────────────────────────────────────────────────────────────

type BlockId = 'today' | 'schedule' | 'pipeline' | 'bottom'
const BLOCK_DEFAULT: BlockId[] = ['today', 'schedule', 'pipeline', 'bottom']
const BLOCK_LABEL: Record<BlockId, string> = {
  'today':    "Today's sessions",
  'schedule': 'Next 3 days',
  'pipeline': 'Active pipeline',
  'bottom':   'Quick actions & staff',
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const r = [...arr]; const [x] = r.splice(from, 1); r.splice(to, 0, x); return r
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const card   = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px' } as const
const sxn    = { fontSize: '11px', fontWeight: '600' as const, color: 'var(--text-4)', letterSpacing: '.08em', textTransform: 'uppercase' as const, margin: 0 }
const badge  = (bg: string, fg: string): React.CSSProperties => ({
  display: 'inline-block', fontSize: '11px', padding: '2px 8px',
  borderRadius: '20px', background: bg, color: fg, fontWeight: 500, whiteSpace: 'nowrap',
})

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardWidgets(props: DashboardProps) {
  const [editMode, setEditMode] = useState(false)
  const [order, setOrder]       = useState<BlockId[]>(BLOCK_DEFAULT)
  const [dragging, setDragging] = useState<BlockId | null>(null)
  const [dragOver, setDragOver] = useState<BlockId | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboard-block-order-v2')
      if (saved) {
        const p: BlockId[] = JSON.parse(saved)
        if (p.length === BLOCK_DEFAULT.length && p.every(id => (BLOCK_DEFAULT as string[]).includes(id))) setOrder(p)
      }
    } catch {}
  }, [])

  function saveOrder(next: BlockId[]) {
    setOrder(next)
    localStorage.setItem('dashboard-block-order-v2', JSON.stringify(next))
  }

  function wrap(id: BlockId, content: React.ReactNode) {
    const isGhost = dragging === id
    const isOver  = dragOver === id && dragging !== id
    return (
      <div
        key={id}
        draggable={editMode}
        onDragStart={() => setDragging(id)}
        onDragOver={e => { e.preventDefault(); setDragOver(id) }}
        onDrop={() => {
          if (dragging && dragging !== id) saveOrder(moveItem(order, order.indexOf(dragging), order.indexOf(id)))
          setDragging(null); setDragOver(null)
        }}
        onDragEnd={() => { setDragging(null); setDragOver(null) }}
        style={{
          opacity: isGhost ? 0.3 : 1, transition: 'opacity .15s',
          borderTop: isOver ? '3px solid var(--btn)' : '3px solid transparent',
          marginBottom: '12px',
        }}
      >
        {editMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px 4px', marginBottom: '4px', background: 'color-mix(in srgb, var(--btn) 7%, transparent)', borderRadius: '8px', cursor: 'grab', userSelect: 'none' }}>
            <svg width="10" height="10" viewBox="0 0 12 12">
              {[0,4,8].map(y => (
                <g key={y}><circle cx="3" cy={y+2} r="1" fill="var(--text-3)" /><circle cx="9" cy={y+2} r="1" fill="var(--text-3)" /></g>
              ))}
            </svg>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '.04em' }}>{BLOCK_LABEL[id].toUpperCase()}</span>
          </div>
        )}
        {content}
      </div>
    )
  }

  // ── Today's sessions ────────────────────────────────────────────────────────

  function renderToday() {
    return (
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={sxn}>Today</p>
          <span style={{ fontSize: '13px', color: 'var(--text-4)' }}>
            {props.todaySessions.length} session{props.todaySessions.length !== 1 ? 's' : ''}
          </span>
        </div>
        {!props.todaySessions.length ? (
          <div style={{ padding: '1.5rem 1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 10px' }}>Nothing scheduled today</p>
            <Link href="/dashboard/sessions/new" style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>+ New session</Link>
          </div>
        ) : (
          props.todaySessions.map((s, i) => {
            const st = styleFor(props.statusStyles,      s.status)
            const ty = styleFor(props.sessionTypeStyles, s.session_type)
            return (
              <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '0.875rem 1.25rem',
                  borderBottom: i < props.todaySessions.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  {/* Time */}
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', flexShrink: 0, minWidth: '54px', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    {s.session_date ? fmtTime(s.session_date) : '—'}
                  </span>
                  {/* Client + ref */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.clients?.full_name ?? '—'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                      {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
                      {s.packages?.name ? ` · ${s.packages.name}` : ''}
                      {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                    </p>
                  </div>
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <span style={badge(ty.color_bg, ty.color_fg)}>{ty.label}</span>
                    <span style={badge(st.color_bg, st.color_fg)}>{st.label}</span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    )
  }

  // ── Next 3 days ─────────────────────────────────────────────────────────────

  function renderSchedule() {
    // Group sessions by date
    const dayGroups: { iso: string; label: string; sessions: Session[] }[] = []
    for (const s of props.next3Sessions) {
      const iso = s.session_date?.slice(0, 10) ?? ''
      let g = dayGroups.find(d => d.iso === iso)
      if (!g) { g = { iso, label: fmtDate(iso), sessions: [] }; dayGroups.push(g) }
      g.sessions.push(s)
    }

    return (
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={sxn}>Next 3 days</p>
          <Link href="/dashboard/sessions" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>All sessions →</Link>
        </div>
        {!props.next3Sessions.length ? (
          <div style={{ padding: '1.5rem 1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>Clear for the next 3 days</p>
          </div>
        ) : (
          dayGroups.map((day, di) => (
            <div key={day.iso}>
              {/* Day header */}
              <div style={{ padding: '0.65rem 1.25rem', background: 'var(--hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line-inner)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{day.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>{day.sessions.length} session{day.sessions.length !== 1 ? 's' : ''}</span>
              </div>
              {/* Sessions for this day */}
              {day.sessions.map((s, i) => {
                const st = styleFor(props.statusStyles,      s.status)
                const ty = styleFor(props.sessionTypeStyles, s.session_type)
                return (
                  <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '0.75rem 1.25rem',
                      borderBottom: (di < dayGroups.length - 1 || i < day.sessions.length - 1) ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-4)', flexShrink: 0, minWidth: '48px', fontFamily: 'monospace' }}>
                        {s.session_date ? fmtTime(s.session_date) : '—'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.clients?.full_name ?? '—'}
                        </p>
                        {s.shoot_type && (
                          <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{s.shoot_type}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <span style={badge(ty.color_bg, ty.color_fg)}>{ty.label}</span>
                        <span style={badge(st.color_bg, st.color_fg)}>{st.label}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ))
        )}
      </div>
    )
  }

  // ── Active pipeline by status ────────────────────────────────────────────────

  function renderPipeline() {
    // Group sessions by status
    const byStatus: Record<string, Session[]> = {}
    for (const s of props.pipelineSessions) {
      if (!byStatus[s.status]) byStatus[s.status] = []
      byStatus[s.status].push(s)
    }

    const groups = props.activeStatuses
      .map(st => ({ ...st, sessions: byStatus[st.value] ?? [] }))
      .filter(g => g.sessions.length > 0)

    return (
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={sxn}>Active pipeline</p>
          <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>
            {props.pipelineSessions.length} active
          </span>
        </div>
        {!groups.length ? (
          <div style={{ padding: '1.5rem 1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No active sessions in the pipeline</p>
          </div>
        ) : (
          groups.map((g, gi) => {
            const MAX = 5
            const shown  = g.sessions.slice(0, MAX)
            const extras = g.sessions.length - MAX
            return (
              <div key={g.value} style={{ borderBottom: gi < groups.length - 1 ? '1px solid var(--line-inner)' : 'none', padding: '0.875rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: shown.length ? '8px' : 0 }}>
                  <span style={badge(g.color_bg, g.color_fg)}>{g.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{g.sessions.length}</span>
                </div>
                {shown.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', alignItems: 'center' }}>
                    {shown.map((s, i) => (
                      <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-2)', background: 'var(--hover)', borderRadius: '6px', padding: '3px 8px', display: 'inline-block' }}>
                          {s.clients?.full_name ?? '—'}
                        </span>
                      </Link>
                    ))}
                    {extras > 0 && (
                      <Link href={`/dashboard/sessions?status=${g.value}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
                        +{extras} more →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    )
  }

  // ── Bottom: quick actions + staff ────────────────────────────────────────────

  function renderBottom() {
    const hasStaff = props.staffToday.length > 0
    return (
      <div style={{ display: 'grid', gridTemplateColumns: hasStaff ? '1fr 1fr' : '1fr', gap: '12px' }} className="dash-bottom-grid">
        {/* Left: quick actions + booking link */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ ...card, padding: '1.25rem' }}>
            <p style={{ ...sxn, marginBottom: '12px' }}>Quick actions</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'New session', href: '/dashboard/sessions/new' },
                { label: 'New invoice', href: '/dashboard/invoices/new' },
                { label: 'Add client',  href: '/dashboard/clients/new' },
                { label: 'Print order', href: '/dashboard/print-orders/new' },
              ].map(a => (
                <Link key={a.href} href={a.href} style={{
                  padding: '7px 14px', borderRadius: '8px', fontSize: '13px',
                  border: '1px solid var(--line)', color: 'var(--text)',
                  textDecoration: 'none', background: 'var(--surface)',
                }}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: '1.25rem' }}>
            <p style={{ ...sxn, marginBottom: '8px' }}>Your booking link</p>
            {!props.studioSlug ? (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 8px', lineHeight: '1.5' }}>
                  Set a URL slug in Settings to get your public booking link.
                </p>
                <Link href="/dashboard/settings" style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none', fontWeight: 500 }}>Go to Settings →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                <code style={{ fontSize: '11px', background: 'var(--hover)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', flex: 1, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {props.siteUrl}/book/{props.studioSlug}
                </code>
                <Link href={`/book/${props.studioSlug}`} target="_blank" rel="noreferrer"
                  style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--btn)', color: 'var(--btn-fg)', borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Open ↗
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right: today's staff */}
        {hasStaff && (
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={sxn}>Staff today</p>
              <Link href="/dashboard/attendance" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Full board →</Link>
            </div>
            {props.staffToday.slice(0, 8).map((m, i) => {
              const checkedIn  = !!m.checkin
              const checkedOut = !!m.checkin?.checked_out_at
              const late       = checkedIn && isLate(m.checkin!.checked_in_at)
              const roles      = m.roles?.length ? m.roles : m.role ? [m.role] : []
              const dotColor   = checkedOut ? '#6abf69' : checkedIn ? '#4a90d9' : '#c8c8c4'
              return (
                <div key={m.staff_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1.25rem',
                  borderBottom: i < Math.min(props.staffToday.length, 8) - 1 ? '1px solid var(--line-inner)' : 'none',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</p>
                      {roles.length > 0 && (
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {roles[0].replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: late ? '#a32d2d' : 'var(--text-4)', fontWeight: late ? 700 : 400, flexShrink: 0 }}>
                    {checkedIn ? (late ? `${fmtTime(m.checkin!.checked_in_at)} LATE` : fmtTime(m.checkin!.checked_in_at)) : '—'}
                  </span>
                </div>
              )
            })}
            {props.staffToday.length > 8 && (
              <div style={{ padding: '0.65rem 1.25rem' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>+{props.staffToday.length - 8} more staff today</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const blockRenderers: Record<BlockId, () => React.ReactNode> = {
    'today':    renderToday,
    'schedule': renderSchedule,
    'pipeline': renderPipeline,
    'bottom':   renderBottom,
  }

  return (
    <div style={{ maxWidth: '860px' }}>
      <style>{`
        @media (max-width: 640px) {
          .dash-bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 500, margin: '0 0 2px' }}>{props.studioName}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>{props.todayLabel}</p>
        </div>
        <button
          onClick={() => setEditMode(e => !e)}
          style={{
            padding: '5px 12px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer',
            background: editMode ? 'var(--btn)' : 'transparent',
            color:      editMode ? 'var(--btn-fg)' : 'var(--text-3)',
            border:     editMode ? '1px solid var(--btn)' : '1px solid var(--line)',
          }}
        >
          {editMode ? 'Done' : 'Arrange'}
        </button>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {(props.pendingCount > 0 || props.overdueCount > 0) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {props.pendingCount > 0 && (
            <Link href={`/dashboard/sessions?status=${props.pendingStatus}`} style={{ textDecoration: 'none', flex: '1 1 auto' }}>
              <div style={{
                background: props.pendingStyle.color_bg,
                border: `1px solid ${props.pendingStyle.color_fg}35`,
                borderRadius: '10px', padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: props.pendingStyle.color_fg }}>
                  🔔 {props.pendingCount} booking request{props.pendingCount !== 1 ? 's' : ''} need{props.pendingCount === 1 ? 's' : ''} a response
                </span>
                <span style={{ fontSize: '12px', color: props.pendingStyle.color_fg, flexShrink: 0, marginLeft: '8px' }}>Review →</span>
              </div>
            </Link>
          )}
          {props.overdueCount > 0 && (
            <Link href="/dashboard/invoices?status=overdue" style={{ textDecoration: 'none', flex: '1 1 auto' }}>
              <div style={{
                background: '#fcebeb', border: '1px solid #f0a0a0',
                borderRadius: '10px', padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#a32d2d' }}>
                  ⚠️ {props.overdueCount} overdue invoice{props.overdueCount !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: '12px', color: '#a32d2d', flexShrink: 0, marginLeft: '8px' }}>Chase →</span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── Draggable blocks ────────────────────────────────────────────────── */}
      {order.map(id => (
        <div key={id}>
          {wrap(id, blockRenderers[id]())}
        </div>
      ))}
    </div>
  )
}
