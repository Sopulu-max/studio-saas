'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import InlineStatusSelect from '@/components/inline-status-select'
import { sessionName } from '@/lib/session-title'

// ── Types ──────────────────────────────────────────────────────────────────

type SessionItem = {
  booking_id: string; booking_ref: number | null
  session_date: string | null; status: string
  session_type: string | null; shoot_type: string | null
  service_type: string | null; client_name: string | null; package_name: string | null
}

type PipelineSession = {
  booking_id: string; booking_ref: number | null
  session_date: string | null; status: string
  session_type: string | null; shoot_type: string | null; client_name: string | null
}

export type ReportsViewProps = {
  activeRange: string; activeTab: string
  finFrom: string | null; finTo: string | null
  todayISO: string; todayLabel: string
  config: {
    bookingStatuses: { value: string; label: string; color_bg: string; color_fg: string; order: number; is_terminal?: boolean; is_cancellation?: boolean }[]
    sessionTypes:    { value: string; label: string; color_bg: string; color_fg: string }[]
    serviceTypes:    { value: string; label: string; color_bg: string; color_fg: string }[]
  }
  revenueInRange: number; revenueAllTime: number
  revenueThisMonth: number; revenueLastMonth: number
  outstanding: number; overdue: number
  paymentsByMethod: { method: string; amount: number; count: number }[]
  revenueBySessionType: { type: string; label: string; color_bg: string; color_fg: string; amount: number; count: number }[]
  revenueByServiceType: { type: string; label: string; color_bg: string; color_fg: string; amount: number; count: number }[]
  monthlyRevenue: { label: string; amount: number; monthKey: string }[]
  sessionsInRange: number; sessionsThisWeek: number
  cancelledInRange: number; completedInRange: number
  todayBookings: SessionItem[]; upcomingBookings: SessionItem[]
  sessionsByType:     { type: string; label: string; color_bg: string; color_fg: string; count: number }[]
  sessionsByService:  { type: string; label: string; color_bg: string; color_fg: string; count: number }[]
  sessionsByCategory: { category: string; count: number }[]
  monthlySessionCounts: { label: string; count: number; monthKey: string }[]
  weekStrip: { iso: string; label: string; isToday: boolean; sessions: number; revenue: number }[]
  pipelineByStatus: { value: string; label: string; color_bg: string; color_fg: string; sessions: PipelineSession[] }[]
  noInvoiceCount: number; noContractCount: number
  totalClients: number; newClientsInRange: number; returningClientsInRange: number
  topClients: { client_id: string; name: string; sessions: number; lastSession: string | null }[]
  staffSessions: { staff_id: string; name: string; role: string | null; total: number; asPhotographer: number; asEditor: number; asVideographer: number; asVideoEditor: number; asColourGrader: number }[]
  staffAttendance: { staff_id: string; name: string; daysPresent: number; totalHours: number }[]
  packageStats: { package_id: string; name: string; bookings: number }[]
  noPackageCount: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtShort(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money', other: 'Other',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function HBar({ value, max, label, sub, color = 'var(--btn)' }: {
  value: number; max: number; label: string; sub?: string; color?: string
}) {
  const pct = max > 0 && value > 0 ? Math.max((value / max) * 100, 3) : 0
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{label}</span>
        {sub && <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{sub}</span>}
      </div>
      <div style={{ height: '6px', background: 'var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px' }} />
      </div>
    </div>
  )
}

function VBars({ data, valueKey, fmtValue, height = 120 }: {
  data: Array<{ label: string } & Record<string, number | string>>
  valueKey: string; fmtValue?: (v: number) => string; height?: number
}) {
  const values = data.map(d => Number(d[valueKey]))
  const max = Math.max(...values, 1)
  const currentLabel = new Date().toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: `${height}px` }}>
      {data.map(item => {
        const v   = Number(item[valueKey])
        const pct = v > 0 ? Math.max((v / max) * 100, 4) : 0
        const cur = item.label === currentLabel
        return (
          <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-4)', whiteSpace: 'nowrap' as const, textAlign: 'center' as const }}>
              {v > 0 ? (fmtValue ? fmtValue(v) : String(v)) : ''}
            </span>
            <div style={{ width: '100%', height: `${pct}%`, background: cur ? 'var(--btn)' : 'var(--line)', borderRadius: '4px 4px 0 0', minHeight: v > 0 ? '4px' : '0' }} />
            <span style={{ fontSize: '10px', color: cur ? 'var(--text)' : 'var(--text-4)', fontWeight: cur ? '600' : '400', whiteSpace: 'nowrap' as const }}>
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function KpiCard({ label, value, sub, subColor, onClick, active }: {
  label: string; value: string; sub?: string; subColor?: string; onClick?: () => void; active?: boolean
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.1rem',
        cursor: onClick ? 'pointer' : 'default',
        outline: active ? '2px solid var(--btn)' : 'none', outlineOffset: '-1px',
      }}
    >
      <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', margin: '3px 0 0', color: subColor ?? 'var(--text-4)' }}>{sub}</p>}
    </div>
  )
}

function CardWrap({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', ...style }}>
      {children}
    </div>
  )
}

function CardList({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function SxnLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>{children}</p>
}

function SecHead({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-4)', letterSpacing: '.08em', textTransform: 'uppercase' as const, margin: '0 0 10px' }}>{children}</p>
}

// ── Constants ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'revenue',  label: 'Revenue'  },
  { id: 'sessions', label: 'Sessions' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'clients',  label: 'Clients'  },
  { id: 'staff',    label: 'Staff'    },
  { id: 'packages', label: 'Packages' },
]

const PRESETS = [
  { value: 'this_month',    label: 'This month'    },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'this_year',     label: 'This year'     },
  { value: 'all_time',      label: 'All time'      },
]

// ── Main component ─────────────────────────────────────────────────────────

export default function ReportsView(props: ReportsViewProps) {
  const router = useRouter()
  const [tab, setTab]               = useState(props.activeTab ?? 'revenue')
  const [customFrom, setCustomFrom] = useState(props.finFrom ?? '')
  const [customTo, setCustomTo]     = useState(props.finTo ?? '')
  const [showCustom, setShowCustom] = useState(props.activeRange === 'custom')

  const { activeRange, finFrom, finTo } = props

  function navigate(range: string, from?: string, to?: string) {
    const p = new URLSearchParams()
    if (from && to) { p.set('from', from); p.set('to', to) }
    else p.set('range', range)
    router.push(`/dashboard/reports?${p.toString()}`)
  }

  const rangeLabel =
    activeRange === 'this_month'    ? 'this month'     :
    activeRange === 'last_3_months' ? 'last 3 months'  :
    activeRange === 'this_year'     ? 'this year'      :
    activeRange === 'custom'        ? `${finFrom ?? ''}–${finTo ?? ''}` :
    'all time'

  const rangeRevenue = activeRange === 'all_time' ? props.revenueAllTime : props.revenueInRange

  // ── Revenue tab ────────────────────────────────────────────────────────

  function renderRevenue() {
    const momDiff    = props.revenueThisMonth - props.revenueLastMonth
    const momPct     = props.revenueLastMonth > 0 ? Math.round((momDiff / props.revenueLastMonth) * 100) : null
    const showMoM    = activeRange === 'this_month' && momPct !== null
    const avgDeal    = props.sessionsInRange > 0 ? Math.round(rangeRevenue / props.sessionsInRange) : 0
    const maxType    = Math.max(...props.revenueBySessionType.map(t => t.amount), 1)
    const maxSvc     = Math.max(...props.revenueByServiceType.map(t => t.amount), 1)
    const maxMethod  = Math.max(...props.paymentsByMethod.map(m => m.amount), 1)

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <KpiCard
            label={activeRange === 'all_time' ? 'All-time collected' : `Collected — ${rangeLabel}`}
            value={fmt(rangeRevenue)}
            sub={showMoM ? `${momDiff >= 0 ? '↑' : '↓'} ${Math.abs(momPct!)}% vs last month` : undefined}
            subColor={showMoM ? (momDiff >= 0 ? '#3b6d11' : '#a32d2d') : undefined}
          />
          {activeRange !== 'all_time' && (
            <KpiCard label="All-time collected" value={fmt(props.revenueAllTime)} />
          )}
          <KpiCard
            label="Avg per session"
            value={props.sessionsInRange > 0 ? fmt(avgDeal) : '—'}
            sub={props.sessionsInRange > 0 ? `${props.sessionsInRange} session${props.sessionsInRange !== 1 ? 's' : ''}` : 'no sessions in range'}
          />
          <KpiCard
            label="Outstanding"
            value={fmt(props.outstanding)}
            sub="unpaid invoices"
            subColor={props.outstanding > 0 ? '#854f0b' : undefined}
          />
          {props.overdue > 0 && (
            <KpiCard label="Overdue" value={fmt(props.overdue)} sub="needs chasing" subColor="#a32d2d" />
          )}
        </div>

        <CardWrap style={{ marginBottom: '12px' }}>
          <SxnLabel>REVENUE — LAST 6 MONTHS</SxnLabel>
          <VBars data={props.monthlyRevenue} valueKey="amount" fmtValue={fmt} />
        </CardWrap>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <CardWrap>
            <SxnLabel>BY SESSION TYPE</SxnLabel>
            {props.revenueBySessionType.length === 0
              ? <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No data in range</p>
              : props.revenueBySessionType.map(t => (
                  <HBar key={t.type} label={t.label} sub={fmt(t.amount)} value={t.amount} max={maxType} color={t.color_fg} />
                ))
            }
          </CardWrap>
          <CardWrap>
            <SxnLabel>BY SERVICE TYPE</SxnLabel>
            {props.revenueByServiceType.length === 0
              ? <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No data in range</p>
              : props.revenueByServiceType.map(t => (
                  <HBar key={t.type} label={t.label} sub={fmt(t.amount)} value={t.amount} max={maxSvc} color={t.color_fg} />
                ))
            }
          </CardWrap>
        </div>

        {props.paymentsByMethod.length > 0 && (
          <CardWrap>
            <SxnLabel>PAYMENT METHODS</SxnLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              {props.paymentsByMethod.map(m => (
                <HBar
                  key={m.method}
                  label={METHOD_LABELS[m.method] ?? m.method}
                  sub={`${fmt(m.amount)} · ${m.count} payment${m.count !== 1 ? 's' : ''}`}
                  value={m.amount} max={maxMethod}
                />
              ))}
            </div>
          </CardWrap>
        )}
      </div>
    )
  }

  // ── Sessions tab ───────────────────────────────────────────────────────

  function renderSessions() {
    const maxTypeCount = Math.max(...props.sessionsByType.map(t => t.count), 1)
    const maxSvcCount  = Math.max(...props.sessionsByService.map(t => t.count), 1)
    const maxCatCount  = Math.max(...props.sessionsByCategory.map(c => c.count), 1)

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <KpiCard label={`Sessions — ${rangeLabel}`} value={String(props.sessionsInRange)} />
          <KpiCard label="Today"     value={String(props.todayBookings.length)} />
          <KpiCard label="This week" value={String(props.sessionsThisWeek)} />
          <KpiCard label="Completed" value={String(props.completedInRange)} />
          {props.cancelledInRange > 0 && (
            <KpiCard label="Cancelled" value={String(props.cancelledInRange)} subColor="#a32d2d" />
          )}
        </div>

        <CardWrap style={{ marginBottom: '12px' }}>
          <SxnLabel>SESSIONS — LAST 6 MONTHS</SxnLabel>
          <VBars data={props.monthlySessionCounts} valueKey="count" height={100} />
        </CardWrap>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <CardWrap>
            <SxnLabel>BY SESSION TYPE</SxnLabel>
            {props.sessionsByType.length === 0
              ? <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No sessions in range</p>
              : props.sessionsByType.map(t => (
                  <HBar key={t.type} label={t.label} sub={`${t.count}`} value={t.count} max={maxTypeCount} color={t.color_fg} />
                ))
            }
          </CardWrap>
          <CardWrap>
            <SxnLabel>BY SERVICE TYPE</SxnLabel>
            {props.sessionsByService.length === 0
              ? <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No sessions in range</p>
              : props.sessionsByService.map(t => (
                  <HBar key={t.type} label={t.label} sub={`${t.count}`} value={t.count} max={maxSvcCount} color={t.color_fg} />
                ))
            }
          </CardWrap>
        </div>

        {props.sessionsByCategory.length > 0 && (
          <CardWrap style={{ marginBottom: '16px' }}>
            <SxnLabel>BY SHOOT CATEGORY</SxnLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              {props.sessionsByCategory.map(c => (
                <HBar key={c.category} label={c.category} sub={`${c.count}`} value={c.count} max={maxCatCount} />
              ))}
            </div>
          </CardWrap>
        )}

        {props.weekStrip.length > 0 && (
          <>
            <SecHead>This week</SecHead>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${props.weekStrip.length}, 1fr)`, gap: '8px', marginBottom: '20px' }}>
              {props.weekStrip.map(day => (
                <div key={day.iso} style={{
                  background: day.isToday ? 'var(--btn)' : 'var(--surface)',
                  border: `1px solid ${day.isToday ? 'var(--btn)' : 'var(--line)'}`,
                  borderRadius: '10px', padding: '0.875rem', textAlign: 'center' as const,
                }}>
                  <p style={{ fontSize: '11px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text-4)', margin: '0 0 4px', fontWeight: '500' }}>{day.label}</p>
                  <p style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 1px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text)' }}>{day.sessions}</p>
                  <p style={{ fontSize: '11px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text-4)', margin: 0 }}>{day.sessions === 1 ? 'session' : 'sessions'}</p>
                  {day.revenue > 0 && (
                    <p style={{ fontSize: '11px', fontWeight: '600', margin: '4px 0 0', color: day.isToday ? 'var(--btn-fg)' : '#3b6d11' }}>{fmt(day.revenue)}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {props.todayBookings.length > 0 && (
          <>
            <SecHead>Today&apos;s sessions</SecHead>
            <CardList style={{ marginBottom: '20px' }}>
              {props.todayBookings.map((s, i) => (
                <div key={s.booking_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: i < props.todayBookings.length - 1 ? '1px solid var(--line-inner)' : 'none', gap: '12px' }}>
                  <Link href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.client_name ?? '—'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace' }}>
                      {sessionName(s.client_name, s.booking_ref, s.booking_id, s.session_date)}
                      {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                      {s.package_name ? ` · ${s.package_name}` : ''}
                    </p>
                  </Link>
                  <InlineStatusSelect sessionId={s.booking_id} currentStatus={s.status} />
                </div>
              ))}
            </CardList>
          </>
        )}

        {props.upcomingBookings.length > 0 && (
          <>
            <SecHead>Upcoming — next 30 days ({props.upcomingBookings.length})</SecHead>
            <CardList>
              {props.upcomingBookings.slice(0, 15).map((s, i) => (
                <div key={s.booking_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: i < Math.min(props.upcomingBookings.length, 15) - 1 ? '1px solid var(--line-inner)' : 'none', gap: '12px' }}>
                  <Link href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.client_name ?? '—'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{fmtShort(s.session_date)}{s.shoot_type ? ` · ${s.shoot_type}` : ''}</p>
                  </Link>
                  <InlineStatusSelect sessionId={s.booking_id} currentStatus={s.status} />
                </div>
              ))}
              {props.upcomingBookings.length > 15 && (
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--line-inner)' }}>
                  <Link href="/dashboard/sessions" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
                    +{props.upcomingBookings.length - 15} more →
                  </Link>
                </div>
              )}
            </CardList>
          </>
        )}

        {props.todayBookings.length === 0 && props.upcomingBookings.length === 0 && (
          <CardWrap style={{ textAlign: 'center' as const }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No sessions today or in the next 30 days</p>
          </CardWrap>
        )}
      </div>
    )
  }

  // ── Pipeline tab ───────────────────────────────────────────────────────

  function renderPipeline() {
    const total = props.pipelineByStatus.reduce((s, g) => s + g.sessions.length, 0)
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <KpiCard label="Active sessions" value={String(total)} />
          {props.noInvoiceCount > 0 && (
            <KpiCard label="No invoice yet" value={String(props.noInvoiceCount)} sub="need invoicing" subColor="#854f0b" />
          )}
          {props.noContractCount > 0 && (
            <KpiCard label="No contract yet" value={String(props.noContractCount)} sub="need contract" subColor="#854f0b" />
          )}
        </div>

        {total > 0 && (
          <CardWrap style={{ marginBottom: '16px' }}>
            <SxnLabel>STATUS BREAKDOWN</SxnLabel>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
              {props.pipelineByStatus.map(g => (
                <div key={g.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: g.color_bg, borderRadius: '20px', padding: '5px 14px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: g.color_fg }}>{g.sessions.length}</span>
                  <span style={{ fontSize: '12px', color: g.color_fg }}>{g.label}</span>
                </div>
              ))}
            </div>
          </CardWrap>
        )}

        {props.pipelineByStatus.length === 0 ? (
          <CardWrap style={{ textAlign: 'center' as const }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No active sessions in the pipeline</p>
          </CardWrap>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {props.pipelineByStatus.map(g => (
              <CardList key={g.value}>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', background: g.color_bg, color: g.color_fg, padding: '3px 12px', borderRadius: '20px' }}>{g.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-2)' }}>{g.sessions.length}</span>
                </div>
                {g.sessions.slice(0, 5).map((s, i) => (
                  <div key={s.booking_id} style={{ padding: '0.75rem 1.25rem', borderBottom: i < Math.min(g.sessions.length, 5) - 1 ? '1px solid var(--line-inner)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <Link href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.client_name ?? '—'}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace' }}>
                        {sessionName(s.client_name, s.booking_ref, s.booking_id, s.session_date)}
                      </p>
                    </Link>
                    <InlineStatusSelect sessionId={s.booking_id} currentStatus={s.status} />
                  </div>
                ))}
                {g.sessions.length > 5 && (
                  <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--line-inner)' }}>
                    <Link href={`/dashboard/sessions?status=${g.value}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
                      +{g.sessions.length - 5} more →
                    </Link>
                  </div>
                )}
              </CardList>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Clients tab ────────────────────────────────────────────────────────

  function renderClients() {
    const inRange    = props.newClientsInRange + props.returningClientsInRange
    const repeatRate = inRange > 0 ? Math.round((props.returningClientsInRange / inRange) * 100) : 0

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <KpiCard label="Total clients" value={String(props.totalClients)} />
          <KpiCard label={`New — ${rangeLabel}`} value={String(props.newClientsInRange)} sub="first-time" />
          <KpiCard label={`Returning — ${rangeLabel}`} value={String(props.returningClientsInRange)} sub="repeat clients" />
          <KpiCard
            label="Repeat rate"
            value={inRange > 0 ? `${repeatRate}%` : '—'}
            sub={inRange > 0 ? 'of sessions in range' : 'no sessions'}
            subColor={repeatRate >= 30 ? '#3b6d11' : undefined}
          />
        </div>

        {props.topClients.length === 0 ? (
          <CardWrap style={{ textAlign: 'center' as const }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No sessions in the selected range</p>
          </CardWrap>
        ) : (
          <CardList>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
              <SxnLabel>TOP CLIENTS — {rangeLabel.toUpperCase()}</SxnLabel>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '12px', padding: '8px 1.25rem', borderBottom: '1px solid var(--line-inner)', background: 'var(--hover)' }}>
              {['CLIENT', 'SESSIONS', 'LAST SESSION'].map((h, i) => (
                <span key={h} style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', textAlign: i > 0 ? 'right' as const : 'left' as const }}>{h}</span>
              ))}
            </div>
            {props.topClients.map((c, i) => (
              <div key={c.client_id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '12px', padding: '0.75rem 1.25rem', borderBottom: i < props.topClients.length - 1 ? '1px solid var(--line-inner)' : 'none', alignItems: 'center' }}>
                <Link href={`/dashboard/clients/${c.client_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>{c.name}</p>
                </Link>
                <span style={{ fontSize: '13px', fontWeight: '600', textAlign: 'right' as const }}>{c.sessions}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-4)', textAlign: 'right' as const }}>{fmtDate(c.lastSession)}</span>
              </div>
            ))}
          </CardList>
        )}
      </div>
    )
  }

  // ── Staff tab ──────────────────────────────────────────────────────────

  function renderStaff() {
    return (
      <div>
        {props.staffSessions.length === 0 ? (
          <CardWrap style={{ textAlign: 'center' as const, marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No staff sessions in the selected range</p>
          </CardWrap>
        ) : (
          <CardList style={{ marginBottom: '12px' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
              <SxnLabel>SESSIONS PER TEAM MEMBER — {rangeLabel.toUpperCase()}</SxnLabel>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 70px 70px', gap: '8px', padding: '8px 1.25rem', borderBottom: '1px solid var(--line-inner)', background: 'var(--hover)' }}>
              {['MEMBER', 'TOTAL', 'PHOTO', 'EDIT', 'VIDEO'].map((h, i) => (
                <span key={h} style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', textAlign: i === 0 ? 'left' as const : 'right' as const }}>{h}</span>
              ))}
            </div>
            {props.staffSessions.map((s, i) => (
              <div key={s.staff_id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 70px 70px', gap: '8px', padding: '0.75rem 1.25rem', borderBottom: i < props.staffSessions.length - 1 ? '1px solid var(--line-inner)' : 'none', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px' }}>{s.name}</p>
                  {s.role && <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{s.role}</p>}
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', textAlign: 'right' as const }}>{s.total}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'right' as const }}>{s.asPhotographer || '—'}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'right' as const }}>{s.asEditor || '—'}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'right' as const }}>{(s.asVideographer + s.asVideoEditor) || '—'}</span>
              </div>
            ))}
          </CardList>
        )}

        {props.staffAttendance.length > 0 && (
          <CardList>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
              <SxnLabel>ATTENDANCE — {rangeLabel.toUpperCase()}</SxnLabel>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px', gap: '8px', padding: '8px 1.25rem', borderBottom: '1px solid var(--line-inner)', background: 'var(--hover)' }}>
              {['MEMBER', 'DAYS IN', 'HRS LOGGED'].map((h, i) => (
                <span key={h} style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', textAlign: i === 0 ? 'left' as const : 'right' as const }}>{h}</span>
              ))}
            </div>
            {props.staffAttendance.map((s, i) => (
              <div key={s.staff_id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px', gap: '8px', padding: '0.75rem 1.25rem', borderBottom: i < props.staffAttendance.length - 1 ? '1px solid var(--line-inner)' : 'none', alignItems: 'center' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>{s.name}</p>
                <span style={{ fontSize: '13px', textAlign: 'right' as const }}>{s.daysPresent}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'right' as const }}>{s.totalHours > 0 ? `${s.totalHours}h` : '—'}</span>
              </div>
            ))}
          </CardList>
        )}

        {props.staffSessions.length === 0 && props.staffAttendance.length === 0 && (
          <CardWrap style={{ textAlign: 'center' as const }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No staff data in the selected range</p>
          </CardWrap>
        )}
      </div>
    )
  }

  // ── Packages tab ───────────────────────────────────────────────────────

  function renderPackages() {
    const totalWithPkg = props.packageStats.reduce((s, p) => s + p.bookings, 0)
    const total        = totalWithPkg + props.noPackageCount
    const pkgRate      = total > 0 ? Math.round((totalWithPkg / total) * 100) : 0
    const maxBookings  = Math.max(...props.packageStats.map(p => p.bookings), 1)
    const activeStats  = props.packageStats.filter(p => p.bookings > 0)

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <KpiCard label={`Sessions — ${rangeLabel}`} value={String(total)} />
          <KpiCard
            label="With a package"
            value={String(totalWithPkg)}
            sub={total > 0 ? `${pkgRate}% attach rate` : undefined}
            subColor={pkgRate >= 60 ? '#3b6d11' : pkgRate > 0 ? '#854f0b' : undefined}
          />
          <KpiCard
            label="No package"
            value={String(props.noPackageCount)}
            sub={props.noPackageCount > 0 ? 'bespoke / unset' : 'all sessions packaged'}
          />
        </div>

        {activeStats.length === 0 ? (
          <CardWrap style={{ textAlign: 'center' as const }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No packages booked in the selected range</p>
          </CardWrap>
        ) : (
          <CardList>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
              <SxnLabel>PACKAGE BOOKINGS — {rangeLabel.toUpperCase()}</SxnLabel>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
              {activeStats.map(p => (
                <HBar
                  key={p.package_id}
                  label={p.name}
                  sub={`${p.bookings} booking${p.bookings !== 1 ? 's' : ''}`}
                  value={p.bookings}
                  max={maxBookings}
                />
              ))}
            </div>
          </CardList>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  function renderTab() {
    switch (tab) {
      case 'revenue':  return renderRevenue()
      case 'sessions': return renderSessions()
      case 'pipeline': return renderPipeline()
      case 'clients':  return renderClients()
      case 'staff':    return renderStaff()
      case 'packages': return renderPackages()
      default:         return renderRevenue()
    }
  }

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* Header + date range picker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '16px', flexWrap: 'wrap' as const }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Reports</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{props.todayLabel}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {PRESETS.map(p => {
              const active = activeRange === p.value && !showCustom
              return (
                <button key={p.value} onClick={() => { setShowCustom(false); navigate(p.value) }}
                  style={{
                    fontSize: '12px', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--btn)' : 'var(--line)'}`,
                    background: active ? 'var(--btn)' : 'var(--surface)',
                    color: active ? 'var(--btn-fg)' : 'var(--text-3)',
                    fontWeight: active ? '600' : '400',
                  }}
                >{p.label}</button>
              )
            })}
            <button onClick={() => setShowCustom(v => !v)}
              style={{
                fontSize: '12px', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                border: `1px solid ${showCustom ? 'var(--btn)' : 'var(--line)'}`,
                background: showCustom ? 'var(--btn)' : 'var(--surface)',
                color: showCustom ? 'var(--btn-fg)' : 'var(--text-3)',
              }}
            >Custom</button>
          </div>
          {showCustom && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)' }} />
              <button
                onClick={() => { if (customFrom && customTo) navigate('custom', customFrom, customTo) }}
                disabled={!customFrom || !customTo}
                style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', cursor: customFrom && customTo ? 'pointer' : 'default', opacity: !customFrom || !customTo ? 0.5 : 1 }}
              >Apply</button>
            </div>
          )}
        </div>
      </div>

      {/* Headline KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.75rem' }}>
        <KpiCard label="Revenue" value={fmt(rangeRevenue)} sub={rangeLabel} onClick={() => setTab('revenue')} active={tab === 'revenue'} />
        <KpiCard label="Sessions" value={String(props.sessionsInRange)} sub={rangeLabel} onClick={() => setTab('sessions')} active={tab === 'sessions'} />
        <KpiCard label="New clients" value={String(props.newClientsInRange)} sub={rangeLabel} onClick={() => setTab('clients')} active={tab === 'clients'} />
        <KpiCard
          label="Outstanding"
          value={fmt(props.outstanding)}
          sub="unpaid invoices"
          subColor={props.outstanding > 0 ? '#854f0b' : undefined}
          onClick={() => setTab('revenue')}
          active={tab === 'revenue'}
        />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--line)', marginBottom: '1.5rem' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              fontSize: '13px', fontWeight: tab === t.id ? '600' : '400',
              padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
              borderBottom: tab === t.id ? '2px solid var(--text)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {renderTab()}

    </div>
  )
}
