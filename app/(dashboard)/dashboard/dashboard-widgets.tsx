'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { sessionName } from '@/lib/session-title'
import InlineStatusSelect from '@/components/inline-status-select'

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

type OutstandingInvoice = {
  invoice_id: string
  total:      number | string | null
  status:     string
  due_date:   string | null
  issued_at:  string | null
  bookings:   {
    booking_ref:  number | null
    session_date: string | null
    clients:      { full_name: string | null } | null
  } | null
}

export type DashboardProps = {
  studioName:        string
  studioSlug:        string | null
  siteUrl:           string
  todayLabel:        string
  pendingCount:      number
  pendingStatus:     string
  pendingStyle:      Style
  overdueCount:      number
  todaySessions:     Session[]
  next3Sessions:     Session[]
  pipelineSessions:  Session[]
  activeStatuses:    (Style & { value: string })[]
  staffToday:        Staff[]
  sessionTypeStyles: Record<string, Style>
  sessionTypeValues: { value: string; label: string; color_bg: string; color_fg: string }[]
  revenueToday:      number
  weekDays:          { iso: string; label: string; isToday: boolean; sessions: number; revenue: number }[]
  outstandingInvoices: OutstandingInvoice[]
  draftCount:        number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return '₦' + n.toLocaleString('en-NG') }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
function styleFor(map: Record<string, Style>, key: string | null | undefined): Style {
  return map[key ?? ''] ?? { label: key ?? '—', color_bg: '#f0f0f0', color_fg: '#555' }
}
function daysOverdue(dueDateISO: string | null): number | null {
  if (!dueDateISO) return null
  const diff = Math.floor((Date.now() - new Date(dueDateISO).getTime()) / 86_400_000)
  return diff > 0 ? diff : null
}
const LATE_H = 8, LATE_M = 30
function isLate(iso: string) {
  const d = new Date(iso)
  return d.getHours() > LATE_H || (d.getHours() === LATE_H && d.getMinutes() > LATE_M)
}

// ─── Layout system ────────────────────────────────────────────────────────────
// Each widget has an id and a span: 1 = half width, 2 = full width.
// The entire dashboard is a 2-column CSS grid; span-2 items use grid-column: span 2.
// alignItems: start on the grid means cards never stretch to match their neighbour.

type BlockId = 'today' | 'revenue' | 'schedule' | 'pipeline' | 'invoices' | 'actions' | 'staff'
type LayoutItem = { id: BlockId; span: 1 | 2 }

const LAYOUT_DEFAULT: LayoutItem[] = [
  { id: 'today',    span: 2 },
  { id: 'revenue',  span: 1 },
  { id: 'schedule', span: 1 },
  { id: 'pipeline', span: 1 },
  { id: 'invoices', span: 1 },
  { id: 'actions',  span: 1 },
  { id: 'staff',    span: 1 },
]

const BLOCK_LABEL: Record<BlockId, string> = {
  today:    "Today's sessions",
  revenue:  'Revenue & weekly stats',
  schedule: 'Next 3 days',
  pipeline: 'Active pipeline',
  invoices: 'Outstanding invoices',
  actions:  'Quick actions',
  staff:    'Staff today',
}

const STORAGE_KEY = 'dashboard-layout-v5'

// ─── Shared styles ────────────────────────────────────────────────────────────

const card  = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px' } as const
const sxn   = { fontSize: '11px', fontWeight: '600' as const, color: 'var(--text-4)', letterSpacing: '.08em', textTransform: 'uppercase' as const, margin: 0 }
const badge = (bg: string, fg: string): React.CSSProperties => ({
  display: 'inline-block', fontSize: '11px', padding: '2px 8px',
  borderRadius: '20px', background: bg, color: fg, fontWeight: 500, whiteSpace: 'nowrap',
})
const INV_STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  overdue: { bg: '#fcebeb', fg: '#a32d2d', label: 'Overdue' },
  sent:    { bg: '#e8f0fb', fg: '#185fa5', label: 'Sent'    },
  draft:   { bg: '#f0f0ee', fg: '#5f5e5a', label: 'Draft'   },
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardWidgets(props: DashboardProps) {
  const [editMode, setEditMode] = useState(false)
  const [layout, setLayout]     = useState<LayoutItem[]>(LAYOUT_DEFAULT)
  const [dragging, setDragging] = useState<BlockId | null>(null)
  const [dragOver, setDragOver] = useState<BlockId | null>(null)

  // Restore saved layout
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: LayoutItem[] = JSON.parse(saved)
        const ids = LAYOUT_DEFAULT.map(l => l.id)
        // Accept only if it contains exactly the right set of block ids
        if (
          parsed.length === ids.length &&
          ids.every(id => parsed.find(p => p.id === id)) &&
          parsed.every(p => ids.includes(p.id) && (p.span === 1 || p.span === 2))
        ) {
          setLayout(parsed)
        }
      }
    } catch {}
  }, [])

  function saveLayout(next: LayoutItem[]) {
    setLayout(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  function toggleSpan(id: BlockId) {
    saveLayout(layout.map(item => item.id === id ? { ...item, span: item.span === 2 ? 1 : 2 } as LayoutItem : item))
  }

  function handleDrop(targetId: BlockId) {
    if (!dragging || dragging === targetId) { setDragging(null); setDragOver(null); return }
    const from = layout.findIndex(l => l.id === dragging)
    const to   = layout.findIndex(l => l.id === targetId)
    const next = [...layout]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    saveLayout(next)
    setDragging(null); setDragOver(null)
  }

  // ── Block wrapper: handles drag, span, edit-mode handle bar ─────────────────

  function wrap(item: LayoutItem, content: React.ReactNode) {
    const isGhost = dragging === item.id
    const isOver  = dragOver === item.id && dragging !== item.id
    return (
      <div
        key={item.id}
        className={item.span === 2 ? 'dash-col-2' : 'dash-col-1'}
        draggable={editMode}
        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragging(item.id) }}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(item.id) }}
        onDrop={e => { e.preventDefault(); handleDrop(item.id) }}
        onDragEnd={() => { setDragging(null); setDragOver(null) }}
        style={{
          gridColumn: item.span === 2 ? 'span 2' : 'span 1',
          opacity:    isGhost ? 0.25 : 1,
          transition: 'opacity .15s',
          outline:    isOver ? '2px solid var(--btn)' : '2px solid transparent',
          outlineOffset: '3px',
          borderRadius: '14px',
        }}
      >
        {editMode && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '5px 10px', marginBottom: '4px',
            background: 'color-mix(in srgb, var(--btn) 8%, transparent)',
            borderRadius: '8px', cursor: 'grab', userSelect: 'none',
          }}>
            {/* Grip icon */}
            <svg width="10" height="14" viewBox="0 0 10 14" style={{ flexShrink: 0 }}>
              {[0, 5, 10].map(y => (
                <g key={y}>
                  <circle cx="2" cy={y + 2} r="1.2" fill="var(--text-3)" />
                  <circle cx="8" cy={y + 2} r="1.2" fill="var(--text-3)" />
                </g>
              ))}
            </svg>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '.04em', flex: 1 }}>
              {BLOCK_LABEL[item.id].toUpperCase()}
            </span>
            {/* Span toggle */}
            <button
              onClick={e => { e.stopPropagation(); toggleSpan(item.id) }}
              title={item.span === 2 ? 'Switch to half width' : 'Switch to full width'}
              style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '6px', cursor: 'pointer',
                background: 'var(--surface)', border: '1px solid var(--line)',
                color: 'var(--text-2)', fontWeight: 500, whiteSpace: 'nowrap',
              }}
            >
              {item.span === 2 ? '⊟ Split' : '⊞ Full'}
            </button>
          </div>
        )}
        {/* In edit mode, block pointer events on card content so links/images
            don't intercept the mousedown and start their own native drag,
            which would prevent the widget drag from ever firing. */}
        <div style={{ pointerEvents: editMode ? 'none' : 'auto' }}>
          {content}
        </div>
      </div>
    )
  }

  // ── Today's sessions ────────────────────────────────────────────────────────

  function renderToday() {
    const todayByStatus: Record<string, number> = {}
    const todayByType:   Record<string, number> = {}
    for (const s of props.todaySessions) {
      todayByStatus[s.status]                  = (todayByStatus[s.status]                  ?? 0) + 1
      todayByType[s.session_type ?? '__other'] = (todayByType[s.session_type ?? '__other'] ?? 0) + 1
    }

    type TypeGroup = { value: string; label: string; color_bg: string; color_fg: string; sessions: Session[] }
    const typeGroups: TypeGroup[] = []
    for (const t of props.sessionTypeValues) {
      const sessions = props.todaySessions.filter(s => (s.session_type ?? '') === t.value)
      if (sessions.length) typeGroups.push({ ...t, sessions })
    }
    for (const s of props.todaySessions) {
      const k = s.session_type ?? '__other'
      if (!props.sessionTypeValues.find(t => t.value === k) && !typeGroups.find(g => g.value === k)) {
        typeGroups.push({
          value: k, label: k === '__other' ? 'Other' : k,
          color_bg: '#f0f0f0', color_fg: '#555',
          sessions: props.todaySessions.filter(x => (x.session_type ?? '__other') === k),
        })
      }
    }

    const typePills   = props.sessionTypeValues.filter(t => (todayByType[t.value]   ?? 0) > 0)
    const statusPills = props.activeStatuses.filter(st  => (todayByStatus[st.value] ?? 0) > 0)

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
          <>
            {(typePills.length > 0 || statusPills.length > 0) && (
              <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                {typePills.map(t => (
                  <span key={t.value} style={badge(t.color_bg, t.color_fg)}>{t.label}: {todayByType[t.value]}</span>
                ))}
                {typePills.length > 0 && statusPills.length > 0 && (
                  <span style={{ width: '1px', height: '14px', background: 'var(--line-inner)', display: 'inline-block', margin: '0 2px' }} />
                )}
                {statusPills.map(st => (
                  <span key={st.value} style={badge(st.color_bg, st.color_fg)}>{st.label}: {todayByStatus[st.value]}</span>
                ))}
              </div>
            )}
            {typeGroups.map((group, gi) => (
              <div key={group.value}>
                <div style={{ padding: '0.55rem 1.25rem', background: 'var(--hover)', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={badge(group.color_bg, group.color_fg)}>{group.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>{group.sessions.length}</span>
                </div>
                {group.sessions.map((s, i) => (
                  <div key={s.booking_id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '0.875rem 1.25rem',
                    borderBottom: (gi < typeGroups.length - 1 || i < group.sessions.length - 1) ? '1px solid var(--line-inner)' : 'none',
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', flexShrink: 0, minWidth: '54px', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                      {s.session_date ? fmtTime(s.session_date) : '—'}
                    </span>
                    <Link href={`/dashboard/sessions/${s.booking_id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.clients?.full_name ?? '—'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
                        {s.packages?.name ? ` · ${s.packages.name}` : ''}
                        {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                      </p>
                    </Link>
                    <InlineStatusSelect sessionId={s.booking_id} currentStatus={s.status} />
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  // ── Revenue & weekly strip ───────────────────────────────────────────────────

  function renderRevenue() {
    return (
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={sxn}>This week</p>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 1px', fontWeight: 500 }}>Today's revenue</p>
            <p style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: props.revenueToday > 0 ? '#3b6d11' : 'var(--text-3)' }}>
              {props.revenueToday > 0 ? fmt(props.revenueToday) : '—'}
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${props.weekDays.length}, 1fr)`, padding: '0.875rem 1.25rem', gap: '8px' }}>
          {props.weekDays.map(day => (
            <div key={day.iso} style={{
              padding: '0.75rem 0.5rem', textAlign: 'center', borderRadius: '10px',
              background: day.isToday ? 'var(--btn)' : 'var(--hover)',
            }}>
              <p style={{ fontSize: '10px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text-4)', margin: '0 0 4px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {day.label}
              </p>
              <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 1px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text)' }}>
                {day.sessions}
              </p>
              <p style={{ fontSize: '10px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text-4)', margin: 0, opacity: 0.8 }}>
                {day.sessions === 1 ? 'session' : 'sessions'}
              </p>
              {day.revenue > 0 && (
                <p style={{ fontSize: '10px', fontWeight: 600, margin: '4px 0 0', color: day.isToday ? 'var(--btn-fg)' : '#3b6d11' }}>
                  {fmt(day.revenue)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Next 3 days ─────────────────────────────────────────────────────────────

  function renderSchedule() {
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
              <div style={{ padding: '0.65rem 1.25rem', background: 'var(--hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line-inner)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{day.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>{day.sessions.length} session{day.sessions.length !== 1 ? 's' : ''}</span>
              </div>
              {day.sessions.map((s, i) => {
                const ty = styleFor(props.sessionTypeStyles, s.session_type)
                return (
                  <div key={s.booking_id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1.25rem',
                    borderBottom: (di < dayGroups.length - 1 || i < day.sessions.length - 1) ? '1px solid var(--line-inner)' : 'none',
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-4)', flexShrink: 0, minWidth: '48px', fontFamily: 'monospace' }}>
                      {s.session_date ? fmtTime(s.session_date) : '—'}
                    </span>
                    <Link href={`/dashboard/sessions/${s.booking_id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.clients?.full_name ?? '—'}
                      </p>
                      {s.shoot_type && <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{s.shoot_type}</p>}
                    </Link>
                    <span style={{ ...badge(ty.color_bg, ty.color_fg), flexShrink: 0 }}>{ty.label}</span>
                    <InlineStatusSelect sessionId={s.booking_id} currentStatus={s.status} />
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    )
  }

  // ── Active pipeline ──────────────────────────────────────────────────────────

  function renderPipeline() {
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
          <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{props.pipelineSessions.length} active</span>
        </div>
        {!groups.length ? (
          <div style={{ padding: '1.5rem 1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No active sessions in the pipeline</p>
          </div>
        ) : (
          groups.map((g, gi) => {
            const MAX = 5; const shown = g.sessions.slice(0, MAX); const extras = g.sessions.length - MAX
            return (
              <div key={g.value} style={{ borderBottom: gi < groups.length - 1 ? '1px solid var(--line-inner)' : 'none' }}>
                <div style={{ padding: '0.65rem 1.25rem', background: 'var(--hover)', borderBottom: '1px solid var(--line-inner)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={badge(g.color_bg, g.color_fg)}>{g.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{g.sessions.length}</span>
                </div>
                {shown.map((s, i) => {
                  const ty = styleFor(props.sessionTypeStyles, s.session_type)
                  return (
                    <div key={s.booking_id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '0.7rem 1.25rem',
                      borderBottom: (i < shown.length - 1 || extras > 0) ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <Link href={`/dashboard/sessions/${s.booking_id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.clients?.full_name ?? '—'}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>
                          {s.session_date ? fmtDateShort(s.session_date) : 'No date'}
                          {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                        </p>
                      </Link>
                      <span style={{ ...badge(ty.color_bg, ty.color_fg), flexShrink: 0 }}>{ty.label}</span>
                      <div style={{ display: 'flex', flexShrink: 0 }}>
                        <InlineStatusSelect sessionId={s.booking_id} currentStatus={s.status} />
                      </div>
                    </div>
                  )
                })}
                {extras > 0 && (
                  <div style={{ padding: '0.6rem 1.25rem' }}>
                    <Link href={`/dashboard/sessions?status=${g.value}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>+{extras} more →</Link>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    )
  }

  // ── Outstanding invoices ─────────────────────────────────────────────────────

  function renderInvoices() {
    const overdue = props.outstandingInvoices.filter(i => i.status === 'overdue')
    const sent    = props.outstandingInvoices.filter(i => i.status === 'sent')
    const draft   = props.outstandingInvoices.filter(i => i.status === 'draft')
    const all     = [...overdue, ...sent, ...draft]
    return (
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <p style={sxn}>Outstanding invoices</p>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {overdue.length > 0 && <span style={badge('#fcebeb', '#a32d2d')}>Overdue: {overdue.length}</span>}
            {sent.length   > 0 && <span style={badge('#e8f0fb', '#185fa5')}>Sent: {sent.length}</span>}
            {draft.length  > 0 && <span style={badge('#f0f0ee', '#5f5e5a')}>Draft: {draft.length}</span>}
            <Link href="/dashboard/invoices" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>All →</Link>
          </div>
        </div>
        {all.length === 0 ? (
          <div style={{ padding: '1.5rem 1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No outstanding invoices 🎉</p>
          </div>
        ) : (
          all.slice(0, 10).map((inv, i) => {
            const st          = INV_STATUS[inv.status] ?? { bg: '#f0f0f0', fg: '#555', label: inv.status }
            const overdueDays = inv.status === 'overdue' ? daysOverdue(inv.due_date) : null
            const clientName  = inv.bookings?.clients?.full_name ?? '—'
            const sessionDate = inv.bookings?.session_date
            const ref         = inv.bookings?.booking_ref
            return (
              <Link key={inv.invoice_id} href={`/dashboard/invoices/${inv.invoice_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.875rem 1.25rem', gap: '12px',
                  borderBottom: i < Math.min(all.length, 10) - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>
                      {ref ? `#${ref}` : inv.invoice_id.slice(-6)}
                      {sessionDate ? ` · ${fmtDateShort(sessionDate)}` : ''}
                      {overdueDays != null
                        ? ` · ${overdueDays}d overdue`
                        : inv.due_date ? ` · Due ${fmtDateShort(inv.due_date)}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: inv.status === 'overdue' ? '#a32d2d' : 'var(--text)' }}>
                      {fmt(Number(inv.total))}
                    </span>
                    <span style={badge(st.bg, st.fg)}>{st.label}</span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
        {all.length > 10 && (
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--line-inner)' }}>
            <Link href="/dashboard/invoices" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
              +{all.length - 10} more outstanding invoices →
            </Link>
          </div>
        )}
      </div>
    )
  }

  // ── Quick actions ────────────────────────────────────────────────────────────

  function renderActions() {
    return (
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
              }}>{a.label}</Link>
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
    )
  }

  // ── Staff today ──────────────────────────────────────────────────────────────

  function renderStaff() {
    if (!props.staffToday.length) {
      return (
        <div style={{ ...card, padding: '1.25rem' }}>
          <p style={{ ...sxn, marginBottom: '8px' }}>Staff today</p>
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No staff scheduled today</p>
        </div>
      )
    }
    return (
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
              padding: '0.75rem 1.25rem', gap: '8px',
              borderBottom: i < Math.min(props.staffToday.length, 8) - 1 ? '1px solid var(--line-inner)' : 'none',
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
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const blockRenderers: Record<BlockId, () => React.ReactNode> = {
    today:    renderToday,
    revenue:  renderRevenue,
    schedule: renderSchedule,
    pipeline: renderPipeline,
    invoices: renderInvoices,
    actions:  renderActions,
    staff:    renderStaff,
  }

  return (
    <div>
      <style>{`
        /* On mobile collapse everything to 1 column */
        @media (max-width: 680px) {
          .dash-grid { grid-template-columns: 1fr !important; }
          .dash-col-1, .dash-col-2 { grid-column: span 1 !important; }
        }
      `}</style>

      {/* Header */}
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

      {/* Alerts */}
      {(props.pendingCount > 0 || props.overdueCount > 0 || props.draftCount > 0) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {props.pendingCount > 0 && (
            <Link href={`/dashboard/sessions?status=${props.pendingStatus}`} style={{ textDecoration: 'none', flex: '1 1 auto' }}>
              <div style={{ background: props.pendingStyle.color_bg, border: `1px solid ${props.pendingStyle.color_fg}35`, borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: props.pendingStyle.color_fg }}>
                  🔔 {props.pendingCount} booking request{props.pendingCount !== 1 ? 's' : ''} need{props.pendingCount === 1 ? 's' : ''} a response
                </span>
                <span style={{ fontSize: '12px', color: props.pendingStyle.color_fg, flexShrink: 0, marginLeft: '8px' }}>Review →</span>
              </div>
            </Link>
          )}
          {props.overdueCount > 0 && (
            <Link href="/dashboard/invoices?status=overdue" style={{ textDecoration: 'none', flex: '1 1 auto' }}>
              <div style={{ background: '#fcebeb', border: '1px solid #f0a0a0', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#a32d2d' }}>⚠️ {props.overdueCount} overdue invoice{props.overdueCount !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: '12px', color: '#a32d2d', flexShrink: 0, marginLeft: '8px' }}>Chase →</span>
              </div>
            </Link>
          )}
          {props.draftCount > 0 && (
            <Link href="/dashboard/invoices?status=draft" style={{ textDecoration: 'none', flex: '1 1 auto' }}>
              <div style={{ background: '#f5f5f3', border: '1px solid #d5d5d0', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#5f5e5a' }}>📋 {props.draftCount} unsent invoice{props.draftCount !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: '12px', color: '#5f5e5a', flexShrink: 0, marginLeft: '8px' }}>Send →</span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* 2-column grid — alignItems: start prevents height-matching between neighbours */}
      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
        {layout.map(item => wrap(item, blockRenderers[item.id]()))}
      </div>
    </div>
  )
}
