'use client'

import { useState } from 'react'
import Link from 'next/link'
import { sessionName } from '@/lib/session-title'
import { cn, unwrapRow } from '@/lib/utils'

// ─── Types (Must match original to accept identical props) ────────────────────
type Style = { label: string; color_bg: string; color_fg: string }
type Session = { session_id: string, session_date?: string | null, session_type?: string | null, shoot_type?: string | null, event_date?: string | null, event_name?: string | null, bookings: { booking_id: string, booking_ref?: number | null, status: string, clients?: { full_name?: string | null } | null, packages?: { name?: string | null } | null } | null }
type OccasionRow = { session_id: string, event_date: string, event_name?: string | null, shoot_type?: string | null, session_type?: string | null, session_date?: string | null, bookings: { booking_id: string, booking_ref?: number | null, status: string, clients?: { full_name?: string | null } | null } | null }
type Staff = { staff_id: string, full_name: string, role: string | null, roles: string[] | null, checkin: { checked_in_at: string; checked_out_at: string | null } | null }
type OutstandingInvoice = { invoice_id: string, total: number | string | null, status: string, due_date: string | null, issued_at: string | null, payments: { amount: number | string }[] | null, bookings: { booking_ref: number | null, clients: { full_name: string | null } | null, sessions: { session_date: string | null }[] | null } | null }

export type DashboardProps = {
  studioName: string, studioSlug: string | null, siteUrl: string, todayLabel: string, pendingCount: number, pendingStatus: string, pendingStyle: Style, overdueCount: number, todaySessions: Session[], next3Sessions: Session[], pipelineSessions: Session[], upcomingOccasions: OccasionRow[], activeStatuses: (Style & { value: string })[], staffToday: Staff[], sessionTypeStyles: Record<string, Style>, sessionTypeValues: { value: string; label: string; color_bg: string; color_fg: string }[], revenueToday: number, revenueWeek: number, sessionsThisWeek: number, todayPaymentsList: { amount: number; method: string; clientName: string | null; bookingRef: number | null; paid_at: string }[], todayByMethod: Record<string, number>, weekDays: { iso: string; label: string; isToday: boolean; sessions: number; revenue: number; byType: Record<string, number>; uniqueClients: number }[], weekByCategory: Record<string, number>, todayClientList: { clientId: string; clientName: string; sessionType: string | null; shootType: string | null; sessionDate: string | null }[], outstandingInvoices: OutstandingInvoice[], draftCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return '₦' + n.toLocaleString('en-NG') }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) }
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(iso); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  return diff >= 0 ? diff : null
}

const badge = (bg: string, fg: string): React.CSSProperties => ({
  display: 'inline-block', fontSize: '11px', padding: '2px 8px',
  borderRadius: '20px', background: bg, color: fg, fontWeight: 500, whiteSpace: 'nowrap',
})

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardWidgets(props: DashboardProps) {
  // Aggregate a "Live Feed" from today's data
  const feedItems: { time: string, title: string, subtitle: string, icon: string, bg: string, color: string }[] = []
  
  for (const s of props.staffToday) {
    if (s.checkin) {
      feedItems.push({ time: s.checkin.checked_in_at, title: `${s.full_name} Checked In`, subtitle: 'Staff Logistics', icon: '👤', bg: '#f0f9ff', color: '#0369a1' })
    }
  }
  for (const p of props.todayPaymentsList) {
    feedItems.push({ time: p.paid_at, title: `${fmt(p.amount)} Paid via ${p.method}`, subtitle: p.clientName || `Booking #${p.bookingRef}`, icon: '💰', bg: '#ecfdf5', color: '#047857' })
  }
  for (const s of props.todaySessions) {
    if (s.session_date) {
      const b = unwrapRow(s.bookings)
      const c = unwrapRow(b?.clients)
      feedItems.push({ time: s.session_date, title: `${c?.full_name || 'Client'} arrived`, subtitle: s.shoot_type || 'Session', icon: '📸', bg: '#fdf4ff', color: '#86198f' })
    }
  }
  feedItems.sort((a, b) => a.time.localeCompare(b.time)).reverse()

  const outstandingBalance = props.outstandingInvoices.reduce((sum, inv) => {
    const paid = inv.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0
    return sum + Math.max(Number(inv.total ?? 0) - paid, 0)
  }, 0)

  return (
    <div className="flex flex-col h-full animate-enter">
      
      {/* Header & Urgent Alerts */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] mb-1">Command Center</h1>
          <p className="text-sm text-[var(--text-4)] uppercase tracking-widest font-semibold">{props.todayLabel}</p>
        </div>
        
        <div className="flex gap-3">
          {(props.pendingCount > 0) && (
            <Link href={`/dashboard/bookings?status=${props.pendingStatus}`} className="flex items-center gap-2 px-4 py-2 rounded-full border hover-lift" style={{ background: 'rgba(124, 58, 237, 0.1)', borderColor: 'rgba(124, 58, 237, 0.3)' }}>
              <span className="w-2 h-2 rounded-full bg-[var(--btn)] animate-pulse" />
              <span className="text-sm font-semibold" style={{ color: 'var(--link)' }}>{props.pendingCount} Pending</span>
            </Link>
          )}
          {(props.overdueCount > 0) && (
            <Link href="/dashboard/invoices?status=overdue" className="flex items-center gap-2 px-4 py-2 rounded-full border hover-lift" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-semibold text-red-400">{props.overdueCount} Overdue</span>
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* LEFT COLUMN: Infrastructure & Revenue */}
        <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 pb-8">
          
          {/* Revenue Engine Cards */}
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-3)] mb-[-8px]">Financial Engine</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel hover-lift p-6 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--btn)] opacity-10 rounded-full blur-2xl" />
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)]">Collected Today</p>
              <h3 className="text-3xl font-black text-[var(--text)] tracking-tight">{props.revenueToday > 0 ? fmt(props.revenueToday) : '₦0'}</h3>
              <p className="text-xs font-semibold" style={{ color: 'var(--link)' }}>from {props.todayPaymentsList.length} payments</p>
            </div>
            <div className="glass-panel hover-lift p-6 flex flex-col gap-2 relative overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)]">This Week</p>
              <h3 className="text-3xl font-black text-[var(--text)] tracking-tight">{props.revenueWeek > 0 ? fmt(props.revenueWeek) : '₦0'}</h3>
              <p className="text-xs text-[var(--text-3)] font-semibold">{props.sessionsThisWeek} total sessions</p>
            </div>
            <Link href="/dashboard/invoices" className="glass-panel hover-lift p-6 flex flex-col gap-2 relative overflow-hidden text-[var(--text)]" style={{ textDecoration: 'none' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)]">Outstanding</p>
              <h3 className="text-3xl font-black tracking-tight">{outstandingBalance > 0 ? fmt(outstandingBalance) : '₦0'}</h3>
              <p className="text-xs font-semibold text-red-400">{props.outstandingInvoices.length} unpaid invoices</p>
            </Link>
          </div>

          {/* Today's Operations Matrix */}
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-3)] mt-2 mb-[-8px]">Today's Services Matrix</h2>
          <div className="glass-panel flex flex-col overflow-hidden">
            {props.todaySessions.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-4)]">No services scheduled for today</div>
            ) : (
              props.todaySessions.map((s, i) => {
                const b = unwrapRow(s.bookings)
                const c = unwrapRow(b?.clients)
                const ty = s.session_type ? (props.sessionTypeStyles[s.session_type] ?? null) : null
                return (
                  <Link key={i} href={`/dashboard/bookings/${b?.booking_id}`} className="flex items-center gap-4 p-5 hover:bg-[var(--hover)] transition-colors border-b border-[var(--line-inner)] last:border-0 text-[var(--text)]" style={{ textDecoration: 'none' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-[15px]">{c?.full_name || 'Client'}</span>
                        {ty && <span style={badge(ty.color_bg, ty.color_fg)}>{ty.label}</span>}
                      </div>
                      <p className="text-xs text-[var(--text-3)] m-0">{s.shoot_type || 'Standard Session'} • Ref: #{b?.booking_ref}</p>
                    </div>
                    {s.session_date && (
                      <div className="text-right flex flex-col items-end">
                        <span className="font-mono font-bold text-sm tracking-widest bg-[var(--surface-2)] px-3 py-1 rounded-md">{fmtTime(s.session_date)}</span>
                      </div>
                    )}
                  </Link>
                )
              })
            )}
          </div>
          
          {/* Studio Catalog Pipeline */}
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-3)] mt-2 mb-[-8px]">Active Pipeline</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {props.activeStatuses.slice(0, 4).map((status, idx) => {
              const count = props.pipelineSessions.filter(s => unwrapRow(s.bookings)?.status === status.value).length
              return (
                <div key={idx} className="glass-panel p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ background: status.color_fg }} />
                    <span className="text-sm font-bold text-[var(--text-2)]">{status.label}</span>
                  </div>
                  <span className="text-xl font-black text-[var(--text)]">{count}</span>
                </div>
              )
            })}
          </div>

        </div>

        {/* RIGHT COLUMN: Live Omnichannel Feed */}
        <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <div className="glass-panel flex-1 flex flex-col overflow-hidden relative">
            <div className="p-5 border-b border-[var(--line-inner)] flex justify-between items-center bg-[var(--surface)] z-10">
              <div>
                <h3 className="font-bold text-[var(--text)] tracking-tight m-0 text-base">Live Feed</h3>
                <p className="text-[11px] text-[var(--text-4)] uppercase tracking-widest font-bold m-0 mt-1">Omnichannel Log</p>
              </div>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-4 bg-[var(--btn)] rounded-full animate-pulse" />
                <span className="w-1.5 h-3 bg-[var(--link)] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-2 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 relative">
              {/* Timeline Line */}
              <div className="absolute left-[39px] top-0 bottom-0 w-px bg-[var(--line-inner)]" />
              
              {feedItems.length === 0 ? (
                <div className="text-center text-[var(--text-4)] text-sm pt-8">No events logged today yet</div>
              ) : (
                <div className="flex flex-col gap-6 relative">
                  {feedItems.map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border border-[var(--line)] shadow-sm transition-transform group-hover:scale-110" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                        <span className="text-sm">{item.icon}</span>
                      </div>
                      <div className="flex flex-col pt-1">
                        <span className="text-[13px] font-bold text-[var(--text)] leading-none">{item.title}</span>
                        <span className="text-[11px] font-semibold text-[var(--text-4)] mt-1.5">{item.subtitle}</span>
                        <span className="text-[10px] font-mono tracking-widest mt-2" style={{ color: 'var(--link)' }}>{fmtTime(item.time)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Fade out bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--bg), transparent)' }} />
          </div>
        </div>

      </div>
    </div>
  )
}
