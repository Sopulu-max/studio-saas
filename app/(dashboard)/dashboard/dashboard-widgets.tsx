'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ServiceOperationDTO, OmnichannelEventDTO, FinancialMetricsDTO } from '@/lib/domains/operations/repository'

export type DashboardProps = {
  studioName: string
  todayLabel: string
  pendingCount: number
  overdueCount: number
  activeOperations: ServiceOperationDTO[]
  omnichannelFeed: OmnichannelEventDTO[]
  financials: FinancialMetricsDTO
  pipelineStatuses: { label: string, value: string, count: number, color: string }[]
}

function fmt(n: number) { return '₦' + n.toLocaleString('en-NG') }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) }

const badge = (bg: string, fg: string): React.CSSProperties => ({
  display: 'inline-block', fontSize: '11px', padding: '2px 8px',
  borderRadius: '20px', background: bg, color: fg, fontWeight: 500, whiteSpace: 'nowrap',
})

export default function DashboardWidgets(props: DashboardProps) {
  // We can derive "Today's Operations" from active operations that have a session_date = today
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayOps = props.activeOperations.filter(op => op.session_date?.startsWith(todayStr))

  return (
    <div className="flex flex-col h-full animate-enter p-6 md:p-8">
      
      {/* Header & Urgent Alerts */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] mb-1">Command Center</h1>
          <p className="text-sm text-[var(--text-4)] uppercase tracking-widest font-semibold">{props.todayLabel}</p>
        </div>
        
        <div className="flex gap-3">
          {(props.pendingCount > 0) && (
            <Link href="/dashboard/bookings?status=pending" className="flex items-center gap-2 px-4 py-2 rounded-full border hover-lift" style={{ background: 'rgba(124, 58, 237, 0.1)', borderColor: 'rgba(124, 58, 237, 0.3)' }}>
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
              <h3 className="text-3xl font-black text-[var(--text)] tracking-tight">{props.financials.collected_today > 0 ? fmt(props.financials.collected_today) : '₦0'}</h3>
              <p className="text-xs font-semibold" style={{ color: 'var(--link)' }}>Live Revenue</p>
            </div>
            <div className="glass-panel hover-lift p-6 flex flex-col gap-2 relative overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)]">This Week</p>
              <h3 className="text-3xl font-black text-[var(--text)] tracking-tight">{props.financials.collected_week > 0 ? fmt(props.financials.collected_week) : '₦0'}</h3>
              <p className="text-xs text-[var(--text-3)] font-semibold">{props.financials.total_sessions_week} total operations</p>
            </div>
            <Link href="/dashboard/invoices" className="glass-panel hover-lift p-6 flex flex-col gap-2 relative overflow-hidden text-[var(--text)]" style={{ textDecoration: 'none' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)]">Outstanding</p>
              <h3 className="text-3xl font-black tracking-tight">{props.financials.outstanding_balance > 0 ? fmt(props.financials.outstanding_balance) : '₦0'}</h3>
              <p className="text-xs font-semibold text-red-400">{props.financials.overdue_invoices_count > 0 ? `${props.financials.overdue_invoices_count} overdue` : 'All settled'}</p>
            </Link>
          </div>

          {/* Today's Operations Matrix */}
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-3)] mt-2 mb-[-8px]">Live Operations (Today)</h2>
          <div className="glass-panel flex flex-col overflow-hidden">
            {todayOps.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-4)]">No services scheduled for today</div>
            ) : (
              todayOps.map((op, i) => {
                return (
                  <Link key={i} href={`/dashboard/bookings/${op.operation_id}`} className="flex items-center gap-4 p-5 hover:bg-[var(--hover)] transition-colors border-b border-[var(--line-inner)] last:border-0 text-[var(--text)]" style={{ textDecoration: 'none' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-[15px]">{op.client_name}</span>
                        <span style={badge('rgba(255,255,255,0.1)', 'var(--text-2)')}>{op.primary_service}</span>
                      </div>
                      <p className="text-xs text-[var(--text-3)] m-0">{op.service_duration} mins • Ref: #{op.reference}</p>
                    </div>
                    {op.session_date && (
                      <div className="text-right flex flex-col items-end">
                        <span className="font-mono font-bold text-sm tracking-widest bg-[var(--surface-2)] px-3 py-1 rounded-md">{fmtTime(op.session_date)}</span>
                      </div>
                    )}
                  </Link>
                )
              })
            )}
          </div>
          
          {/* Active Pipeline */}
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-3)] mt-2 mb-[-8px]">Active Pipeline</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {props.pipelineStatuses.map((status, idx) => {
              return (
                <div key={idx} className="glass-panel p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ background: status.color }} />
                    <span className="text-sm font-bold text-[var(--text-2)]">{status.label}</span>
                  </div>
                  <span className="text-xl font-black text-[var(--text)]">{status.count}</span>
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
              
              {props.omnichannelFeed.length === 0 ? (
                <div className="text-center text-[var(--text-4)] text-sm pt-8">No events logged today yet</div>
              ) : (
                <div className="flex flex-col gap-6 relative">
                  {props.omnichannelFeed.map((item, i) => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border border-[var(--line)] shadow-sm transition-transform group-hover:scale-110" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                        <span className="text-sm">{item.icon}</span>
                      </div>
                      <div className="flex flex-col pt-1">
                        <span className="text-[13px] font-bold text-[var(--text)] leading-none">{item.title}</span>
                        <span className="text-[11px] font-semibold text-[var(--text-4)] mt-1.5">{item.subtitle}</span>
                        <span className="text-[10px] font-mono tracking-widest mt-2 flex items-center gap-2">
                          <span style={{ color: 'var(--link)' }}>{fmtTime(item.timestamp)}</span>
                          <span className="uppercase text-[8px] px-1.5 py-0.5 rounded border border-[var(--line)]" style={{ background: 'var(--surface)' }}>{item.source}</span>
                        </span>
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
