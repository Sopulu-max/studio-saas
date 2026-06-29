'use client'

import { useState } from 'react'
import Link from 'next/link'
import { sessionName } from '@/lib/session-title'
import InlineStatusSelect from '@/components/inline-status-select'
import { cn } from '@/lib/utils'
import { unwrapRow } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Style = { label: string; color_bg: string; color_fg: string }

type Session = {
  session_id:    string
  session_date?: string | null
  session_type?: string | null
  shoot_type?:   string | null
  event_date?:   string | null
  event_name?:   string | null
  bookings: {
    booking_id:    string
    booking_ref?:  number | null
    status:        string
    clients?:      { full_name?: string | null } | null
    packages?:     { name?: string | null } | null
  } | null
}

type OccasionRow = {
  session_id:    string
  event_date:    string
  event_name?:   string | null
  shoot_type?:   string | null
  session_type?: string | null
  session_date?: string | null
  bookings: {
    booking_id:    string
    booking_ref?:  number | null
    status:        string
    clients?:      { full_name?: string | null } | null
  } | null
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
  payments:   { amount: number | string }[] | null
  bookings:   {
    booking_ref:  number | null
    clients:      { full_name: string | null } | null
    sessions:     { session_date: string | null }[] | null
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
  upcomingOccasions: OccasionRow[]
  activeStatuses:    (Style & { value: string })[]
  staffToday:        Staff[]
  sessionTypeStyles: Record<string, Style>
  sessionTypeValues: { value: string; label: string; color_bg: string; color_fg: string }[]
  revenueToday:      number
  revenueWeek:       number
  sessionsThisWeek:  number
  todayPaymentsList: { amount: number; method: string; clientName: string | null; bookingRef: number | null; paid_at: string }[]
  todayByMethod:     Record<string, number>
  weekDays:          { iso: string; label: string; isToday: boolean; sessions: number; revenue: number; byType: Record<string, number>; uniqueClients: number }[]
  weekByCategory:    Record<string, number>
  todayClientList:   { clientId: string; clientName: string; sessionType: string | null; shootType: string | null; sessionDate: string | null }[]
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
function fmtDateMini(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}
function styleFor(map: Record<string, Style>, key: string | null | undefined): Style {
  return map[key ?? ''] ?? { label: key ?? '—', color_bg: '#f0f0f0', color_fg: '#555' }
}
function daysOverdue(dueDateISO: string | null): number | null {
  if (!dueDateISO) return null
  const diff = Math.floor((Date.now() - new Date(dueDateISO).getTime()) / 86_400_000)
  return diff > 0 ? diff : null
}
/** Days until a date (0 = today). Returns null if date is in the past. */
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(iso); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  return diff >= 0 ? diff : null
}
const LATE_H = 8, LATE_M = 30
function isLate(iso: string) {
  const d = new Date(iso)
  return d.getHours() > LATE_H || (d.getHours() === LATE_H && d.getMinutes() > LATE_M)
}

// ─── Layout system ────────────────────────────────────────────────────────────

type ColType   = 'left' | 'right' | 'full'
type BlockId   = 'kpis' | 'occasions' | 'today' | 'clients' | 'revenue' | 'schedule' | 'pipeline' | 'invoices' | 'staff'
type LayoutItem = { id: BlockId; col: ColType }

const LAYOUT_DEFAULT: LayoutItem[] = [
  { id: 'kpis',      col: 'full'  },
  { id: 'occasions', col: 'full'  },
  { id: 'today',     col: 'left'  },
  { id: 'pipeline',  col: 'right' },
  { id: 'clients',   col: 'left'  },
  { id: 'revenue',   col: 'right' },
  { id: 'schedule',  col: 'left'  },
  { id: 'invoices',  col: 'right' },
  { id: 'staff',     col: 'right' },
]

const BLOCK_LABEL: Record<BlockId, string> = {
  kpis:      'Key metrics',
  occasions: 'Category dates',
  today:     "Today's sessions",
  clients:   'Clients',
  revenue:   'Revenue',
  schedule:  'Next 3 days',
  pipeline:  'Active pipeline',
  invoices:  'Outstanding invoices',
  staff:     'Staff today',
}

const STORAGE_KEY = 'dashboard-layout-v9'

function getInitialLayout(): LayoutItem[] {
  if (typeof window === 'undefined') return LAYOUT_DEFAULT

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return LAYOUT_DEFAULT

    const parsed: LayoutItem[] = JSON.parse(saved)
    const ids = LAYOUT_DEFAULT.map((item) => item.id)
    const validCols = new Set<ColType>(['left', 'right', 'full'])

    const isValid =
      parsed.length === ids.length &&
      ids.every((id) => parsed.some((item) => item.id === id)) &&
      parsed.every((item) => ids.includes(item.id) && validCols.has(item.col))

    return isValid ? parsed : LAYOUT_DEFAULT
  } catch {
    return LAYOUT_DEFAULT
  }
}

// ─── Shared styles ────────────────────────────────────────────────────────────


const sxn   = { fontSize: '12px', fontWeight: '700' as const, color: 'var(--text-2)', letterSpacing: '.06em', textTransform: 'uppercase' as const, margin: 0 }
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
  const [editMode,       setEditMode]       = useState(false)
  const [layout,         setLayout]         = useState<LayoutItem[]>(getInitialLayout)
  const [alertDismissed, setAlertDismissed] = useState(false)

  function saveLayout(next: LayoutItem[]) {
    setLayout(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  function setCol(id: BlockId, col: ColType) {
    saveLayout(layout.map(item => item.id === id ? { ...item, col } : item))
  }

  function moveInCol(id: BlockId, dir: -1 | 1) {
    const item = layout.find(l => l.id === id)!
    if (item.col === 'full') {
      const fi = layout.findIndex(l => l.id === id)
      const ti = fi + dir
      if (ti < 0 || ti >= layout.length) return
      const next = [...layout]; [next[fi], next[ti]] = [next[ti], next[fi]]
      saveLayout(next)
    } else {
      const colItems = layout.map((l, i) => ({ l, i })).filter(({ l }) => l.col === item.col)
      const ci = colItems.findIndex(({ l }) => l.id === id)
      const ti = ci + dir
      if (ti < 0 || ti >= colItems.length) return
      const fFrom = colItems[ci].i
      const fTo   = colItems[ti].i
      const next  = [...layout]; [next[fFrom], next[fTo]] = [next[fTo], next[fFrom]]
      saveLayout(next)
    }
  }

  // ── Widget wrapper ──────────────────────────────────────────────────────────

  function renderWidget(item: LayoutItem) {
    let canUp = false, canDown = false
    if (item.col === 'full') {
      const fi = layout.findIndex(l => l.id === item.id)
      canUp   = fi > 0
      canDown = fi < layout.length - 1
    } else {
      const col = layout.filter(l => l.col === item.col)
      const ci  = col.findIndex(l => l.id === item.id)
      canUp   = ci > 0
      canDown = ci < col.length - 1
    }

    return (
      <div key={item.id}>
        {editMode && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
            padding: '5px 8px', marginBottom: '5px',
            background: 'color-mix(in srgb, var(--btn) 8%, transparent)',
            borderRadius: '8px', userSelect: 'none',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '.05em', flex: 1, minWidth: '60px' }}>
              {BLOCK_LABEL[item.id].toUpperCase()}
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {(['left', 'full', 'right'] as ColType[]).map(c => (
                <button key={c} onClick={() => setCol(item.id, c)}
                  title={c === 'left' ? 'Left half' : c === 'full' ? 'Full width' : 'Right half'}
                  style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '5px',
                    cursor: 'pointer', border: '1px solid',
                    background:  item.col === c ? 'var(--btn)' : 'var(--surface)',
                    borderColor: item.col === c ? 'var(--btn)' : 'var(--line)',
                    color:       item.col === c ? 'var(--btn-fg)' : 'var(--text-3)',
                    fontWeight: 500,
                  }}
                >
                  {c === 'left' ? '← Half' : c === 'full' ? '⊞ Full' : 'Half →'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              {([[-1, '↑', canUp], [1, '↓', canDown]] as [number, string, boolean][]).map(([d, lbl, en]) => (
                <button key={d} onClick={() => moveInCol(item.id, d as -1 | 1)} disabled={!en}
                  style={{
                    fontSize: '12px', padding: '1px 7px', borderRadius: '5px',
                    cursor: en ? 'pointer' : 'default',
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    color: en ? 'var(--text-2)' : 'var(--text-4)', fontWeight: 600,
                  }}
                >{lbl}</button>
              ))}
            </div>
          </div>
        )}
        <div style={{ pointerEvents: editMode ? 'none' : 'auto' }}>
          {blockRenderers[item.id]()}
        </div>
      </div>
    )
  }

  // ── Segment layout ──────────────────────────────────────────────────────────

  type Seg =
    | { type: 'full'; item: LayoutItem }
    | { type: 'cols'; left: LayoutItem[]; right: LayoutItem[] }

  function getSegments(): Seg[] {
    const segs: Seg[] = []
    let left: LayoutItem[] = [], right: LayoutItem[] = []
    const flush = () => {
      if (left.length || right.length) {
        segs.push({ type: 'cols', left: [...left], right: [...right] })
        left = []; right = []
      }
    }
    for (const item of layout) {
      if (item.col === 'full')      { flush(); segs.push({ type: 'full', item }) }
      else if (item.col === 'left') left.push(item)
      else                          right.push(item)
    }
    flush()
    return segs
  }

  // ── KPI strip ───────────────────────────────────────────────────────────────

  function renderKpis() {
    const outstandingBalance = props.outstandingInvoices.reduce((sum, inv) => {
      const paid = inv.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0
      return sum + Math.max(Number(inv.total ?? 0) - paid, 0)
    }, 0)
    const overdueInvoiceCount = props.outstandingInvoices.filter(i => i.status === 'overdue').length

    // Pipeline shape: top 3 statuses by count
    const byStatus: Record<string, number> = {}
    for (const s of props.pipelineSessions) byStatus[unwrapRow(s.bookings)?.status ?? ''] = (byStatus[unwrapRow(s.bookings)?.status ?? ''] ?? 0) + 1
    const pipelineSub = props.activeStatuses
      .filter(s => byStatus[s.value])
      .slice(0, 3)
      .map(s => `${byStatus[s.value]} ${s.label}`)
      .join(' · ') || 'All clear'

    const kpis: {
      label: string; primary: string; unit?: string
      sub: string; subColor?: string; accentColor?: string
      href: string
    }[] = [
      {
        label:   'Today',
        primary: String(props.todaySessions.length),
        unit:    props.todaySessions.length === 1 ? 'session' : 'sessions',
        sub:     props.revenueToday > 0 ? `${fmt(props.revenueToday)} collected` : 'No payments yet',
        subColor: props.revenueToday > 0 ? '#3b6d11' : undefined,
        href:    '/dashboard/bookings',
      },
      {
        label:   'This week',
        primary: String(props.sessionsThisWeek),
        unit:    props.sessionsThisWeek === 1 ? 'session' : 'sessions',
        sub: (() => {
          // Build a session-type breakdown from weekDays
          const totals: Record<string, number> = {}
          for (const d of props.weekDays) {
            for (const [t, n] of Object.entries(d.byType)) totals[t] = (totals[t] ?? 0) + n
          }
          const parts = props.sessionTypeValues
            .filter(t => (totals[t.value] ?? 0) > 0)
            .map(t => `${totals[t.value]} ${t.label}`)
          return parts.length ? parts.join(' · ') : (props.revenueWeek > 0 ? `${fmt(props.revenueWeek)} collected` : 'No sessions yet')
        })(),
        subColor: undefined,
        href:    '/dashboard/bookings',
      },
      {
        label:   'Active pipeline',
        primary: String(props.pipelineSessions.length),
        unit:    props.pipelineSessions.length === 1 ? 'session' : 'sessions',
        sub:     pipelineSub,
        href:    '/dashboard/bookings',
      },
      {
        label:   'Outstanding',
        primary: outstandingBalance > 0 ? fmt(outstandingBalance) : '—',
        sub:     overdueInvoiceCount > 0
          ? `${overdueInvoiceCount} overdue`
          : props.outstandingInvoices.length > 0
            ? `${props.outstandingInvoices.length} invoice${props.outstandingInvoices.length !== 1 ? 's' : ''}`
            : 'All settled',
        subColor:     overdueInvoiceCount > 0 ? '#a32d2d' : undefined,
        accentColor:  overdueInvoiceCount > 0 ? '#a32d2d' : undefined,
        href:    overdueInvoiceCount > 0 ? '/dashboard/invoices?status=overdue' : '/dashboard/invoices',
      },
    ]

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        <style>{`@media (max-width: 680px) { .kpi-grid { grid-template-columns: repeat(2,1fr) !important; } }`}</style>
        {kpis.map((k, i) => (
          <Link key={i} href={k.href} className={cn("glass-panel hover-lift", i === 0 && 'kpi-grid')} style={{ padding: '1.1rem 1.25rem', textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <p style={{ ...sxn, marginBottom: '10px' }}>{k.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 1px', letterSpacing: '-0.02em', lineHeight: 1, color: k.accentColor ?? 'var(--text)' }}>
              {k.primary}
            </p>
            {k.unit && (
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '3px 0 8px' }}>{k.unit}</p>
            )}
            <p style={{ fontSize: '12px', margin: 0, color: k.subColor ?? 'var(--text-4)', fontWeight: k.subColor ? 600 : 400 }}>
              {k.sub}
            </p>
          </Link>
        ))}
      </div>
    )
  }

  // ── Category dates ────────────────────────────────────────────────────────────
  // Sessions where the client's actual birthday / wedding / graduation / etc.
  // falls within the next 14 days.  The date comes from the "Category date" field
  // in the session form — the day the real-life event happens, not the shoot day.
  // Use this to prioritise delivery so clients receive their photos in time.
  // When the date is TODAY you can also reach out with wishes.

  function renderOccasions() {
    const occs = props.upcomingOccasions
    if (!occs.length && !editMode) return null

    function urgency(days: number): { color: string; label: string; ruleOpacity: number } {
      if (days === 0) return { color: '#c0392b', label: 'TODAY',       ruleOpacity: 1    }
      if (days === 1) return { color: '#d4600a', label: 'Tomorrow',    ruleOpacity: 1    }
      if (days <= 3)  return { color: '#d4600a', label: `In ${days}d`, ruleOpacity: 1    }
      if (days <= 7)  return { color: '#b45309', label: `In ${days}d`, ruleOpacity: 0.65 }
      return               { color: '#4a90d9', label: `In ${days}d`, ruleOpacity: 0.35 }
    }

    const todayCount = occs.filter(o => daysUntil(o.event_date) === 0).length

    return (
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={sxn}>Category dates</p>
            <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '2px 0 0' }}>
              The actual birthday, wedding, graduation, etc. — deliver before these dates
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0, marginLeft: '12px' }}>
            {todayCount > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#c0392b' }}>
                🎉 {todayCount} today — send wishes!
              </span>
            )}
            <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>
              {occs.length} in the next 14 days
            </span>
          </div>
        </div>

        {occs.length === 0 ? (
          <div style={{ padding: '1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No category dates in the next 14 days</p>
          </div>
        ) : (
          occs.map((occ, i) => {
            const days     = daysUntil(occ.event_date) ?? 0
            const urg      = urgency(days)
            const stCfg    = props.activeStatuses.find(s => s.value === unwrapRow(occ.bookings)?.status)
            const category = occ.shoot_type || null
            const isToday  = days === 0
            return (
              <Link key={occ.session_id} href={`/dashboard/bookings/${unwrapRow(occ.bookings)?.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '0.875rem 1.25rem',
                  borderBottom: i < occs.length - 1 ? '1px solid var(--line-inner)' : 'none',
                  background: isToday ? `${urg.color}08` : 'transparent',
                }}>
                  {/* Coloured urgency rule */}
                  <div style={{ width: '3px', alignSelf: 'stretch', borderRadius: '2px', background: urg.color, flexShrink: 0, opacity: urg.ruleOpacity }} />

                  {/* Countdown column */}
                  <div style={{ flexShrink: 0, width: '62px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: urg.color, margin: '0 0 1px', letterSpacing: '.01em' }}>
                      {urg.label}
                    </p>
                    <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: 0 }}>
                      {fmtDateMini(occ.event_date)}
                    </p>
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Row 1: category badge + client name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      {category && (
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                          background: `${urg.color}18`, color: urg.color, whiteSpace: 'nowrap',
                        }}>
                          {isToday ? `🎉 ${category}` : category}
                        </span>
                      )}
                      <span style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {unwrapRow(unwrapRow(occ.bookings)?.clients)?.full_name ?? '—'}
                      </span>
                    </div>
                    {/* Row 2: context — shot date + ref */}
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isToday
                        ? `${category ?? 'Category date'} is today — consider reaching out with wishes`
                        : occ.event_name
                          ? `"${occ.event_name}"`
                          : `${category ?? 'Category'} date: ${fmtDateMini(occ.event_date)}`
                      }
                      {occ.session_date ? ` · Shot ${fmtDateShort(occ.session_date)}` : ''}
                      {unwrapRow(occ.bookings)?.booking_ref  ? ` · #${unwrapRow(occ.bookings).booking_ref}` : ''}
                    </p>
                  </div>

                  {/* Status badge */}
                  {stCfg && (
                    <span style={{ ...badge(stCfg.color_bg, stCfg.color_fg), flexShrink: 0 }}>
                      {stCfg.label}
                    </span>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>
    )
  }

  // ── Today's sessions ────────────────────────────────────────────────────────

  function renderToday() {
    const todayByStatus: Record<string, number> = {}
    const todayByType:   Record<string, number> = {}
    for (const s of props.todaySessions) {
      todayByStatus[unwrapRow(s.bookings)?.status ?? '']                  = (todayByStatus[unwrapRow(s.bookings)?.status ?? '']                  ?? 0) + 1
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
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={sxn}>Today</p>
          <span style={{ fontSize: '13px', color: 'var(--text-4)' }}>
            {props.todaySessions.length} session{props.todaySessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {!props.todaySessions.length ? (
          <div style={{ padding: '1.5rem 1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 10px' }}>Nothing scheduled today</p>
            <Link href="/dashboard/bookings/new" style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>+ New session</Link>
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
                {group.sessions.map((s, i) => {
                  const days = daysUntil(s.event_date)
                  const hasUrgentOccasion = days !== null && days <= 7
                  return (
                    <div key={s.session_id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '0.875rem 1.25rem',
                      borderBottom: (gi < typeGroups.length - 1 || i < group.sessions.length - 1) ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', flexShrink: 0, minWidth: '54px', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {s.session_date ? fmtTime(s.session_date) : '—'}
                      </span>
                      <Link href={`/dashboard/bookings/${unwrapRow(s.bookings)?.booking_id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {unwrapRow(unwrapRow(s.bookings)?.clients)?.full_name ?? '—'}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                          {sessionName(unwrapRow(unwrapRow(s.bookings)?.clients)?.full_name, unwrapRow(s.bookings)?.booking_ref, unwrapRow(s.bookings)?.booking_id, s.session_date)}
                          {unwrapRow(unwrapRow(s.bookings)?.packages)?.name ? ` · ${unwrapRow(unwrapRow(s.bookings).packages).name}` : ''}
                          {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                        </p>
                      </Link>
                      {/* Category date chip — shows actual birthday/wedding/etc. date */}
                      {hasUrgentOccasion && s.shoot_type && s.event_date && (() => {
                        const color = days === 0 ? '#c0392b' : days! <= 2 ? '#d4600a' : '#b45309'
                        const txt   = days === 0
                          ? `🎉 ${s.shoot_type} is today!`
                          : `${s.shoot_type}: ${fmtDateMini(s.event_date)}`
                        return <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: `${color}18`, color, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{txt}</span>
                      })()}
                      <InlineStatusSelect sessionId={unwrapRow(s.bookings)?.booking_id!} currentStatus={unwrapRow(s.bookings)?.status!} />
                    </div>
                  )
                })}
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  // ── Revenue & weekly strip ───────────────────────────────────────────────────

  function renderRevenue() {
    const methodLabel: Record<string, string> = {
      cash: 'Cash', bank_transfer: 'Bank transfer', card: 'Card',
      pos: 'POS', online: 'Online', other: 'Other',
    }
    const methodOrder = ['cash', 'pos', 'card', 'bank_transfer', 'online', 'other']
    const methodEntries = methodOrder
      .filter(m => props.todayByMethod[m] != null)
      .map(m => ({ key: m, label: methodLabel[m] ?? m, amount: props.todayByMethod[m] }))
    for (const [k, v] of Object.entries(props.todayByMethod)) {
      if (!methodOrder.includes(k)) methodEntries.push({ key: k, label: k, amount: v })
    }
    const hasTodayPayments = props.todayPaymentsList.length > 0

    return (
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...sxn, margin: 0 }}>Revenue</p>
          <Link href="/dashboard/invoices" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
            Invoices →
          </Link>
        </div>

        {/* Today */}
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasTodayPayments ? '10px' : 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', margin: 0, letterSpacing: '.03em' }}>Today</p>
            <p style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: props.revenueToday > 0 ? '#3b6d11' : 'var(--text-3)' }}>
              {props.revenueToday > 0 ? fmt(props.revenueToday) : '—'}
            </p>
          </div>

          {hasTodayPayments && (
            <>
              {/* Method chips */}
              {methodEntries.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {methodEntries.map(e => (
                    <span key={e.key} style={{
                      display: 'inline-flex', gap: '5px', alignItems: 'center',
                      fontSize: '11px', padding: '3px 9px', borderRadius: '20px',
                      background: '#e8f4ec', color: '#1e5e34', fontWeight: 500,
                    }}>
                      <span style={{ fontWeight: 400, opacity: 0.75 }}>{e.label}</span>
                      <span>{fmt(e.amount)}</span>
                    </span>
                  ))}
                </div>
              )}
              {/* Per-payment list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {props.todayPaymentsList.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '4px 0',
                    borderBottom: i < props.todayPaymentsList.length - 1 ? '1px solid var(--line-inner)' : 'none',
                    gap: '10px',
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {p.clientName ?? '—'}
                        {p.bookingRef != null && (
                          <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-4)', marginLeft: '4px' }}>#{p.bookingRef}</span>
                        )}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-4)' }}>
                        {fmtTime(p.paid_at)} · {methodLabel[p.method] ?? p.method}
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#3b6d11', flexShrink: 0 }}>{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* This week sub-label */}
        <div style={{ padding: '1.25rem 1.5rem 0.5rem' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', margin: '0 0 8px', letterSpacing: '.03em' }}>This week</p>
        </div>

        {/* Weekly day strip */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${props.weekDays.length}, 1fr)`, padding: '0 1.25rem 0.875rem', gap: '8px' }}>
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
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={sxn}>Next 3 days</p>
          <Link href="/dashboard/bookings" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>All sessions →</Link>
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
                const ty   = styleFor(props.sessionTypeStyles, s.session_type)
                const days = daysUntil(s.event_date)
                const hasOccasion = days !== null && days <= 14
                return (
                  <div key={s.session_id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1.25rem',
                    borderBottom: (di < dayGroups.length - 1 || i < day.sessions.length - 1) ? '1px solid var(--line-inner)' : 'none',
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-4)', flexShrink: 0, minWidth: '48px', fontFamily: 'monospace' }}>
                      {s.session_date ? fmtTime(s.session_date) : '—'}
                    </span>
                    <Link href={`/dashboard/bookings/${unwrapRow(s.bookings)?.booking_id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {unwrapRow(unwrapRow(s.bookings)?.clients)?.full_name ?? '—'}
                      </p>
                      {s.shoot_type && <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{s.shoot_type}</p>}
                    </Link>
                    {hasOccasion && s.shoot_type && s.event_date && (() => {
                      const color = days === 0 ? '#c0392b' : days! <= 3 ? '#d4600a' : '#b45309'
                      const txt   = days === 0
                        ? `🎉 ${s.shoot_type} is today!`
                        : `${s.shoot_type}: ${fmtDateMini(s.event_date)}`
                      return (
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: `${color}18`, color, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {txt}
                        </span>
                      )
                    })()}
                    <span style={{ ...badge(ty.color_bg, ty.color_fg), flexShrink: 0 }}>{ty.label}</span>
                    <InlineStatusSelect sessionId={unwrapRow(s.bookings)?.booking_id!} currentStatus={unwrapRow(s.bookings)?.status!} />
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
      if (!byStatus[unwrapRow(s.bookings)?.status ?? '']) byStatus[unwrapRow(s.bookings)?.status ?? ''] = []
      byStatus[unwrapRow(s.bookings)?.status ?? ''].push(s)
    }
    const groups = props.activeStatuses
      .map(st => ({ ...st, sessions: byStatus[st.value] ?? [] }))
      .filter(g => g.sessions.length > 0)

    const total = props.pipelineSessions.length

    return (
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={sxn}>Active pipeline</p>
          <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{total} active</span>
        </div>

        {/* Stage bar */}
        {total > 0 && (
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
            {/* Proportional bar */}
            <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', gap: '2px', marginBottom: '10px' }}>
              {groups.map(g => (
                <div key={g.value}
                  title={`${g.label}: ${g.sessions.length}`}
                  style={{ flex: g.sessions.length, background: g.color_fg, borderRadius: '2px', minWidth: '4px' }}
                />
              ))}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {groups.map(g => (
                <div key={g.value} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: g.color_fg, flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>{g.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{g.sessions.length}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  const ty   = styleFor(props.sessionTypeStyles, s.session_type)
                  const days = daysUntil(s.event_date)
                  const hasOccasion = days !== null && days <= 14
                  return (
                    <div key={s.session_id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '0.85rem 1.5rem',
                      borderBottom: (i < shown.length - 1 || extras > 0) ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <Link href={`/dashboard/bookings/${unwrapRow(s.bookings)?.booking_id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {unwrapRow(unwrapRow(s.bookings)?.clients)?.full_name ?? '—'}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>
                          {s.session_date ? fmtDateShort(s.session_date) : 'No date'}
                          {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                        </p>
                      </Link>
                      {/* Category date chip */}
                      {hasOccasion && s.shoot_type && s.event_date && (() => {
                        const color = days === 0 ? '#c0392b' : days! <= 3 ? '#d4600a' : '#b45309'
                        const txt   = days === 0
                          ? `🎉 ${s.shoot_type} is today!`
                          : `${s.shoot_type}: ${fmtDateMini(s.event_date)}`
                        return (
                          <span style={{ ...badge(`${color}18`, color), flexShrink: 0, fontSize: '10px' }}>
                            {txt}
                          </span>
                        )
                      })()}
                      <span style={{ ...badge(ty.color_bg, ty.color_fg), flexShrink: 0 }}>{ty.label}</span>
                      <div style={{ display: 'flex', flexShrink: 0 }}>
                        <InlineStatusSelect sessionId={unwrapRow(s.bookings)?.booking_id!} currentStatus={unwrapRow(s.bookings)?.status!} />
                      </div>
                    </div>
                  )
                })}
                {extras > 0 && (
                  <div style={{ padding: '0.6rem 1.25rem' }}>
                    <Link href={`/dashboard/bookings?status=${g.value}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>+{extras} more →</Link>
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

    const totalRemaining = all.reduce((sum, inv) => {
      const paid    = inv.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0
      const balance = Math.max(Number(inv.total ?? 0) - paid, 0)
      return sum + balance
    }, 0)

    const SHOW = 10
    return (
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <p style={{ ...sxn, marginBottom: totalRemaining > 0 ? '3px' : 0 }}>Outstanding invoices</p>
            {totalRemaining > 0 && (
              <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: overdue.length > 0 ? '#a32d2d' : 'var(--text)' }}>
                {fmt(totalRemaining)} remaining
              </p>
            )}
          </div>
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
          all.slice(0, SHOW).map((inv, i) => {
            const paid        = inv.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0
            const balance     = Math.max(Number(inv.total ?? 0) - paid, 0)
            const isPartial   = paid > 0
            const st          = INV_STATUS[inv.status] ?? { bg: '#f0f0f0', fg: '#555', label: inv.status }
            const overdueDays = inv.status === 'overdue' ? daysOverdue(inv.due_date) : null
            const clientName  = unwrapRow(unwrapRow(inv.bookings)?.clients)?.full_name ?? '—'
            const sessionDate = unwrapRow(inv.bookings)?.sessions?.[0]?.session_date
            const ref         = unwrapRow(inv.bookings)?.booking_ref
            return (
              <Link key={inv.invoice_id} href={`/dashboard/invoices/${inv.invoice_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.875rem 1.25rem', gap: '12px',
                  borderBottom: i < Math.min(all.length, SHOW) - 1 ? '1px solid var(--line-inner)' : 'none',
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: inv.status === 'overdue' ? '#a32d2d' : 'var(--text)' }}>
                        {fmt(balance)}
                      </span>
                      <span style={badge(st.bg, st.fg)}>{st.label}</span>
                    </div>
                    {isPartial && (
                      <span style={{ fontSize: '10px', color: '#3b6d11' }}>{fmt(paid)} paid · {fmt(Number(inv.total ?? 0))} total</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        )}
        {all.length > SHOW && (
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--line-inner)' }}>
            <Link href="/dashboard/invoices" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
              +{all.length - SHOW} more outstanding invoices →
            </Link>
          </div>
        )}
      </div>
    )
  }

  // ── Staff today ──────────────────────────────────────────────────────────────

  function renderStaff() {
    if (!props.staffToday.length) {
      return (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <p style={{ ...sxn, marginBottom: '8px' }}>Staff today</p>
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No staff scheduled today</p>
        </div>
      )
    }
    return (
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
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
            <Link key={m.staff_id} href={`/dashboard/staff/${m.staff_id}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1.25rem', gap: '8px',
              borderBottom: i < Math.min(props.staffToday.length, 8) - 1 ? '1px solid var(--line-inner)' : 'none',
              textDecoration: 'none', color: 'inherit',
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
            </Link>
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

  // ── Clients block ────────────────────────────────────────────────────────────
  // Domain: Who are this week's clients? How does activity break down by type/category?

  function renderClients() {
    const totalClientsThisWeek = (() => {
      const ids = new Set<string>()
      for (const d of props.weekDays) {
        // We don't have per-day client IDs here; uniqueClients is per-day, sum them
        // as an approximation — but to avoid double-counting across days we use
        // todayClientList for today and the weekDays sum for the full-week figure.
        // The accurate unique count comes from page.tsx; here use sum(uniqueClients)
        // as a reasonable proxy (per-day unique, not cross-week unique).
        ids.add(String(d.uniqueClients))
      }
      return props.weekDays.reduce((s, d) => s + d.uniqueClients, 0)
    })()

    // Weekly session type totals (from weekDays.byType)
    const weekTypeTotals: Record<string, number> = {}
    for (const d of props.weekDays) {
      for (const [t, n] of Object.entries(d.byType)) weekTypeTotals[t] = (weekTypeTotals[t] ?? 0) + n
    }

    // Shoot category totals this week
    const categoryEntries = Object.entries(props.weekByCategory).sort((a, b) => b[1] - a[1])

    // Today's client list
    const todayClients = props.todayClientList

    return (
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={sxn}>Clients</p>
          <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>
            {props.sessionsThisWeek} session{props.sessionsThisWeek !== 1 ? 's' : ''} this week
          </span>
        </div>

        {/* Weekly day strip */}
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
          <p style={{ ...sxn, marginBottom: '8px' }}>Day by day</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${props.weekDays.length}, 1fr)`, gap: '6px' }}>
            {props.weekDays.map(day => {
              const typeEntries = Object.entries(day.byType)
              return (
                <div key={day.iso} style={{
                  padding: '0.65rem 0.4rem', textAlign: 'center', borderRadius: '10px',
                  background: day.isToday ? 'var(--btn)' : 'var(--hover)',
                }}>
                  <p style={{ fontSize: '10px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text-4)', margin: '0 0 4px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {day.label}
                  </p>
                  <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 1px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text)' }}>
                    {day.sessions}
                  </p>
                  {/* Session type mini-dots */}
                  {typeEntries.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {typeEntries.map(([t, n]) => {
                        const style = props.sessionTypeStyles[t]
                        return (
                          <span key={t} title={`${style?.label ?? t}: ${n}`} style={{
                            fontSize: '9px', padding: '1px 5px', borderRadius: '8px',
                            background: day.isToday ? 'rgba(255,255,255,0.25)' : (style?.color_bg ?? '#eee'),
                            color:      day.isToday ? 'var(--btn-fg)'           : (style?.color_fg ?? '#555'),
                            fontWeight: 600,
                          }}>
                            {n}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {day.uniqueClients > 0 && (
                    <p style={{ fontSize: '9px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text-4)', margin: '3px 0 0', opacity: 0.75 }}>
                      {day.uniqueClients}c
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Session type breakdown this week */}
        {Object.keys(weekTypeTotals).length > 0 && (
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
            <p style={{ ...sxn, marginBottom: '8px' }}>By session type</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {props.sessionTypeValues
                .filter(t => (weekTypeTotals[t.value] ?? 0) > 0)
                .map(t => (
                  <span key={t.value} style={badge(t.color_bg, t.color_fg)}>
                    {t.label} · {weekTypeTotals[t.value]}
                  </span>
                ))
              }
              {/* Any types not in sessionTypeValues */}
              {Object.entries(weekTypeTotals)
                .filter(([t]) => !props.sessionTypeValues.find(s => s.value === t))
                .map(([t, n]) => (
                  <span key={t} style={badge('#f0f0f0', '#555')}>{t} · {n}</span>
                ))
              }
            </div>
          </div>
        )}

        {/* Shoot category breakdown this week */}
        {categoryEntries.length > 0 && (
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
            <p style={{ ...sxn, marginBottom: '8px' }}>By category</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {categoryEntries.map(([cat, n]) => (
                <span key={cat} style={{
                  fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                  background: 'var(--hover)', color: 'var(--text-2)',
                  fontWeight: 500, display: 'inline-flex', gap: '5px',
                }}>
                  <span>{cat}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{n}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Today's client list */}
        <div style={{ padding: '1.25rem 1.5rem 0.5rem' }}>
          <p style={{ ...sxn, marginBottom: todayClients.length ? '0' : '8px' }}>Today&apos;s clients</p>
        </div>
        {todayClients.length === 0 ? (
          <div style={{ padding: '0.75rem 1.5rem 1.5rem' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No clients scheduled today</p>
          </div>
        ) : (
          todayClients.map((c, i) => {
            const ty  = c.sessionType ? (props.sessionTypeStyles[c.sessionType] ?? null) : null
            return (
              <Link key={`${c.clientId}-${i}`} href={`/dashboard/clients/${c.clientId}`} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid var(--line-inner)',
                textDecoration: 'none', color: 'inherit',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.clientName}
                  </p>
                  {c.shootType && (
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{c.shootType}</p>
                  )}
                </div>
                {ty && (
                  <span style={{ ...badge(ty.color_bg, ty.color_fg), flexShrink: 0 }}>{ty.label}</span>
                )}
                {c.sessionDate && (
                  <span style={{ fontSize: '11px', color: 'var(--text-4)', flexShrink: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    {fmtTime(c.sessionDate)}
                  </span>
                )}
              </Link>
            )
          })
        )}
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const blockRenderers: Record<BlockId, () => React.ReactNode> = {
    kpis:      renderKpis,
    occasions: renderOccasions,
    today:     renderToday,
    clients:   renderClients,
    revenue:   renderRevenue,
    schedule:  renderSchedule,
    pipeline:  renderPipeline,
    invoices:  renderInvoices,
    staff:     renderStaff,
  }

  return (
    <div>
      <style>{`
        @media (max-width: 680px) {
          .dash-two-col { flex-direction: column !important; }
          .dash-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
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

      {/* ── Category date alert banner ─────────────────────────────────────────── */}
      {(() => {
        if (alertDismissed) return null
        const urgent = props.upcomingOccasions.filter(o => {
          const d = daysUntil(o.event_date)
          return d !== null && d <= 7
        })
        if (!urgent.length) return null

        const todayOnes  = urgent.filter(o => daysUntil(o.event_date) === 0)
        const tomorrowOnes = urgent.filter(o => daysUntil(o.event_date) === 1)
        const isAnyToday = todayOnes.length > 0

        return (
          <div style={{
            marginBottom: '1.25rem', padding: '12px 16px',
            background: isAnyToday ? '#fef3c7' : '#fef9ec',
            border: `1px solid ${isAnyToday ? '#f59e0b' : '#fcd34d'}`,
            borderRadius: '10px',
            display: 'flex', alignItems: 'flex-start', gap: '12px',
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>
              {isAnyToday ? '🎉' : '📅'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', margin: '0 0 4px' }}>
                {isAnyToday
                  ? `${todayOnes.length} occasion${todayOnes.length > 1 ? 's' : ''} today — consider reaching out`
                  : tomorrowOnes.length > 0
                    ? `${urgent.length} upcoming occasion${urgent.length > 1 ? 's' : ''} — including 1 tomorrow`
                    : `${urgent.length} upcoming occasion${urgent.length > 1 ? 's' : ''} within the next 7 days`
                }
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                {urgent.slice(0, 3).map(o => {
                  const days = daysUntil(o.event_date) ?? 0
                  const label = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days}d`
                  return (
                    <Link
                      key={o.session_id}
                      href={`/dashboard/bookings/${unwrapRow(o.bookings)?.booking_id}`}
                      style={{
                        fontSize: '12px', padding: '2px 8px', borderRadius: '6px',
                        background: '#fde68a', color: '#78350f',
                        textDecoration: 'none', fontWeight: '500', whiteSpace: 'nowrap' as const,
                      }}
                    >
                      {o.shoot_type ?? 'Occasion'} — {unwrapRow(unwrapRow(o.bookings)?.clients)?.full_name ?? '?'} ({label})
                    </Link>
                  )
                })}
                {urgent.length > 3 && (
                  <span style={{ fontSize: '12px', color: '#92400e' }}>+{urgent.length - 3} more</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setAlertDismissed(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#b45309', fontSize: '16px', padding: '0 2px',
                lineHeight: 1, flexShrink: 0,
              }}
              title="Dismiss"
            >
              ×
            </button>
          </div>
        )
      })()}

      {/* Alerts */}
      {(props.pendingCount > 0 || props.overdueCount > 0 || props.draftCount > 0) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {props.pendingCount > 0 && (
            <Link href={`/dashboard/bookings?status=${props.pendingStatus}`} style={{ textDecoration: 'none', flex: '1 1 auto' }}>
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

      {/* Segmented layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {getSegments().map((seg) => {
          if (seg.type === 'full') {
            return <div key={seg.item.id}>{renderWidget(seg.item)}</div>
          }

          const { left, right } = seg
          const hasLeft  = left.length > 0
          const hasRight = right.length > 0
          const segKey   = `cols-${(left[0] ?? right[0]).id}`

          if (!hasLeft || !hasRight) {
            return (
              <div key={segKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...left, ...right].map(item => renderWidget(item))}
              </div>
            )
          }

          return (
            <div key={segKey} className="dash-two-col"
              style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
            >
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {left.map(item => renderWidget(item))}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {right.map(item => renderWidget(item))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

