'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import TodayActions from './today-actions'
import { sessionName } from '@/lib/session-title'

// ─── Types ────────────────────────────────────────────────────────────────────

type Style   = { label: string; color_bg: string; color_fg: string }
type Session = {
  booking_id:   string
  booking_ref?: number | null
  session_date?: string | null
  session_type?: string | null
  status:        string
  clients?:      { full_name?: string | null } | null
  packages?:     { name?: string | null } | null
}
type Staff = {
  staff_id:     string
  full_name:    string
  role:         string | null
  roles:        string[] | null
  checkin:      { checked_in_at: string; checked_out_at: string | null } | null
}
type Stat = { label: string; value: string | number; href: string; sub: string | null; money?: boolean }

export type DashboardProps = {
  studioName:       string
  studioSlug:       string | null
  siteUrl:          string
  todayLabel:       string
  pendingCount:     number
  pendingStatus:    string
  pendingStyle:     Style
  todaySessions:    Session[]
  upcomingSessions: Session[]
  activeSessions:   Session[]
  staffToday:       Staff[]
  stats:            Stat[]
  statusStyles:     Record<string, Style>
  sessionTypeStyles:Record<string, Style>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LATE_H = 8, LATE_M = 30
function isLate(iso: string) {
  const d = new Date(iso)
  return d.getHours() > LATE_H || (d.getHours() === LATE_H && d.getMinutes() > LATE_M)
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}
function style(map: Record<string, Style>, key: string | null | undefined): Style {
  return map[key ?? ''] ?? { label: key ?? '—', color_bg: '#f0f0f0', color_fg: '#555' }
}
function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const r = [...arr]; const [x] = r.splice(from, 1); r.splice(to, 0, x); return r
}

// ─── Block IDs and defaults ───────────────────────────────────────────────────

type BlockId = 'today-sessions' | 'stats' | 'pipeline' | 'bottom'
const BLOCK_DEFAULT: BlockId[] = ['today-sessions', 'stats', 'pipeline', 'bottom']
const BLOCK_LABEL: Record<BlockId, string> = {
  'today-sessions': "Today's sessions",
  'stats':          'Key metrics',
  'pipeline':       'Upcoming & pipeline',
  'bottom':         'Actions, booking link & staff',
}

// ─── Drag handle ──────────────────────────────────────────────────────────────

function GripHandle({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '6px 10px 4px', marginBottom: '4px',
      background: 'color-mix(in srgb, var(--btn) 8%, transparent)',
      borderRadius: '8px', cursor: 'grab', userSelect: 'none',
    }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        {[0,4,8].map(y => (
          <g key={y}>
            <circle cx="3" cy={y+2} r="1" fill="var(--text-3)" />
            <circle cx="9" cy={y+2} r="1" fill="var(--text-3)" />
          </g>
        ))}
      </svg>
      <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: '600', letterSpacing: '.04em' }}>
        {label.toUpperCase()}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardWidgets(props: DashboardProps) {
  const [editMode, setEditMode]   = useState(false)
  const [order, setOrder]         = useState<BlockId[]>(BLOCK_DEFAULT)
  const [dragging, setDragging]   = useState<BlockId | null>(null)
  const [dragOver, setDragOver]   = useState<BlockId | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboard-block-order')
      if (saved) {
        const p: BlockId[] = JSON.parse(saved)
        if (p.length === BLOCK_DEFAULT.length && p.every(id => (BLOCK_DEFAULT as string[]).includes(id))) {
          setOrder(p)
        }
      }
    } catch {}
  }, [])

  function saveOrder(next: BlockId[]) {
    setOrder(next)
    localStorage.setItem('dashboard-block-order', JSON.stringify(next))
  }
  function onDragStart(id: BlockId) { setDragging(id) }
  function onDragOver(e: React.DragEvent, id: BlockId) { e.preventDefault(); setDragOver(id) }
  function onDrop(id: BlockId) {
    if (dragging && dragging !== id) {
      saveOrder(moveItem(order, order.indexOf(dragging), order.indexOf(id)))
    }
    setDragging(null); setDragOver(null)
  }
  function onDragEnd() { setDragging(null); setDragOver(null) }

  function wrap(id: BlockId, content: React.ReactNode) {
    const isGhost = dragging === id
    const isOver  = dragOver === id && dragging !== id
    return (
      <div
        key={id}
        draggable={editMode}
        onDragStart={() => onDragStart(id)}
        onDragOver={e => onDragOver(e, id)}
        onDrop={() => onDrop(id)}
        onDragEnd={onDragEnd}
        style={{
          opacity:    isGhost ? 0.35 : 1,
          transition: 'opacity .15s',
          cursor:     editMode ? 'grab' : 'default',
          borderTop:  isOver ? '3px solid var(--btn)' : '3px solid transparent',
          marginBottom: '14px',
        }}
      >
        {editMode && <GripHandle label={BLOCK_LABEL[id]} />}
        {content}
      </div>
    )
  }

  // ── Block renderers ─────────────────────────────────────────────────────────

  function renderTodaySessions() {
    if (!props.todaySessions.length) return null
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>TODAY</p>
          <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        {props.todaySessions.map((s, i) => {
          const st = style(props.statusStyles,      s.status)
          const ty = style(props.sessionTypeStyles, s.session_type)
          return (
            <div key={s.booking_id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < props.todaySessions.length - 1 ? '1px solid var(--line-inner)' : 'none',
            }}>
              <Link href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px', fontFamily: 'monospace' }}>
                  {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                  {s.clients?.full_name}
                  {s.session_date ? ` · ${new Date(s.session_date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  {s.packages?.name ? ` · ${s.packages.name}` : ''}
                </p>
              </Link>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: ty.color_bg, color: ty.color_fg }}>{ty.label}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: st.color_bg, color: st.color_fg, fontWeight: '500' }}>{st.label}</span>
                <TodayActions sessionId={s.booking_id} status={s.status} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderStats() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="dash-stats-grid">
        {props.stats.map(stat => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.04em' }}>{stat.label}</p>
              <p style={{ fontSize: stat.money ? '22px' : '30px', fontWeight: '600', margin: '0 0 4px', color: 'var(--text)', letterSpacing: stat.money ? '-.02em' : '-.01em' }}>
                {stat.value}
              </p>
              {stat.sub && <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>{stat.sub}</p>}
            </div>
          </Link>
        ))}
      </div>
    )
  }

  function renderPipeline() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="dash-two-col">
        {/* Upcoming this week */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>UPCOMING THIS WEEK</p>
            <Link href="/dashboard/sessions" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>All →</Link>
          </div>
          {!props.upcomingSessions.length ? (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 12px' }}>No sessions in the next 7 days</p>
              <Link href="/dashboard/sessions/new" style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>+ New session</Link>
            </>
          ) : props.upcomingSessions.map((s, i) => {
            const st = style(props.statusStyles,      s.status)
            const ty = style(props.sessionTypeStyles, s.session_type)
            return (
              <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < props.upcomingSessions.length - 1 ? '1px solid var(--line-inner)' : 'none' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px', fontFamily: 'monospace' }}>
                      {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                      {s.clients?.full_name}
                      {s.session_date ? ` · ${new Date(s.session_date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}
                      {s.packages?.name ? ` · ${s.packages.name}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: ty.color_bg, color: ty.color_fg, fontWeight: '500' }}>{ty.label}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: st.color_bg, color: st.color_fg, fontWeight: '500' }}>{st.label}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Active pipeline */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>ACTIVE PIPELINE</p>
            <Link href="/dashboard/sessions" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>All →</Link>
          </div>
          {!props.activeSessions.length ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>Nothing in progress right now</p>
          ) : props.activeSessions.map((s, i) => {
            const st = style(props.statusStyles, s.status)
            return (
              <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < props.activeSessions.length - 1 ? '1px solid var(--line-inner)' : 'none' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: 0, fontFamily: 'monospace' }}>
                    {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
                  </p>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: st.color_bg, color: st.color_fg, fontWeight: '500' }}>{st.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  function renderBottom() {
    const hasStaff = props.staffToday.length > 0
    return (
      <div style={{ display: 'grid', gridTemplateColumns: hasStaff ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }} className="dash-bottom-grid">
        {/* Quick actions */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>QUICK ACTIONS</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'New session', href: '/dashboard/sessions/new' },
              { label: 'New invoice', href: '/dashboard/invoices/new' },
              { label: 'Add client',  href: '/dashboard/clients/new' },
              { label: 'Print order', href: '/dashboard/print-orders/new' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--line)', color: 'var(--text)', textDecoration: 'none', background: 'var(--surface)' }}>
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Booking link */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 4px' }}>YOUR BOOKING LINK</p>
          {!props.studioSlug ? (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 10px', lineHeight: '1.5' }}>Set a URL slug in Settings to get your public booking link.</p>
              <Link href="/dashboard/settings" style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none', fontWeight: '500' }}>Go to Settings →</Link>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 10px' }}>Share with clients to receive booking requests.</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <code style={{ fontSize: '11px', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', flex: 1, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {props.siteUrl}/book/{props.studioSlug}
                </code>
                <Link href={`/book/${props.studioSlug}`} target="_blank" rel="noreferrer"
                  style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--btn)', color: 'var(--btn-fg)', borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Open ↗
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Today's staff — compact corner widget */}
        {hasStaff && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>TODAY'S STAFF</p>
              <Link href="/dashboard/attendance" style={{ fontSize: '11px', color: 'var(--link)', textDecoration: 'none' }}>Full board →</Link>
            </div>
            {props.staffToday.slice(0, 6).map((m, i) => {
              const checkedIn  = !!m.checkin
              const checkedOut = !!m.checkin?.checked_out_at
              const late       = checkedIn && isLate(m.checkin!.checked_in_at)
              const roles: string[] = m.roles?.length ? m.roles : m.role ? [m.role] : []
              let dotColor = '#c8c8c4'
              if (checkedOut) dotColor = '#6abf69'
              else if (checkedIn) dotColor = '#4a90d9'
              return (
                <div key={m.staff_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0',
                  borderBottom: i < Math.min(props.staffToday.length, 6) - 1 ? '1px solid var(--line-inner)' : 'none',
                  gap: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</p>
                      {roles.length > 0 && <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roles[0].replace(/_/g, ' ')}</p>}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: late ? '#a32d2d' : 'var(--text-4)', fontWeight: late ? '700' : '400', flexShrink: 0 }}>
                    {checkedIn ? (late ? `${fmtTime(m.checkin!.checked_in_at)} LATE` : fmtTime(m.checkin!.checked_in_at)) : '—'}
                  </span>
                </div>
              )
            })}
            {props.staffToday.length > 6 && (
              <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '8px 0 0' }}>+{props.staffToday.length - 6} more</p>
            )}
          </div>
        )}
      </div>
    )
  }

  const blockRenderers: Record<BlockId, () => React.ReactNode> = {
    'today-sessions': renderTodaySessions,
    'stats':          renderStats,
    'pipeline':       renderPipeline,
    'bottom':         renderBottom,
  }

  // ── Full render ─────────────────────────────────────────────────────────────

  return (
    <div>
      <style>{`
        @media (max-width: 700px) {
          .dash-stats-grid  { grid-template-columns: repeat(2,1fr) !important; }
          .dash-two-col     { grid-template-columns: 1fr !important; }
          .dash-bottom-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 420px) {
          .dash-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }} className="dash-header">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 2px' }}>Welcome back</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{props.studioName}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>{props.todayLabel}</p>
          <button
            onClick={() => setEditMode(e => !e)}
            style={{
              padding: '5px 12px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer',
              background: editMode ? 'var(--btn)' : 'transparent',
              color:      editMode ? 'var(--btn-fg)' : 'var(--text-3)',
              border:     editMode ? '1px solid var(--btn)' : '1px solid var(--line)',
            }}
          >
            {editMode ? 'Done' : 'Edit layout'}
          </button>
        </div>
      </div>

      {/* Pending banner — fixed, not draggable */}
      {props.pendingCount > 0 && (
        <Link href={`/dashboard/sessions?status=${props.pendingStatus}`} style={{ textDecoration: 'none' }}>
          <div style={{
            background: props.pendingStyle.color_bg,
            border: `0.5px solid ${props.pendingStyle.color_fg}40`,
            borderRadius: '10px', padding: '12px 16px', marginBottom: '14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: props.pendingStyle.color_fg }}>
              🔔 {props.pendingCount} pending booking request{props.pendingCount !== 1 ? 's' : ''} — needs your response
            </span>
            <span style={{ fontSize: '13px', color: props.pendingStyle.color_fg }}>Review →</span>
          </div>
        </Link>
      )}

      {/* Reorderable blocks */}
      {order.map(id => (
        <div key={id}>
          {wrap(id, blockRenderers[id]())}
        </div>
      ))}
    </div>
  )
}
