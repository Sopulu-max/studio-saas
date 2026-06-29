import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'
import { fetchActiveOperations } from '@/lib/domains/operations/repository'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

export default async function OperationsPipelinePage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { admin, studioId } = context
  const studioRow = await fetchStudio(admin, studioId)
  const config = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  // 1. Fetch operations
  const operations = await fetchActiveOperations(admin, studioId, 500)

  // 2. Build Kanban columns based on active statuses
  const activeStatuses = config.bookingStatuses
    .filter(s => !s.is_cancellation && !s.is_terminal)
    .sort((a, b) => a.order - b.order)

  const opsByStatus = new Map<string, typeof operations>()
  for (const op of operations) {
    const arr = opsByStatus.get(op.status) ?? []
    arr.push(op)
    opsByStatus.set(op.status, arr)
  }

  function fmtTime(iso: string) { return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 md:p-8 animate-enter">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] mb-1">Active Pipeline</h1>
          <p className="text-sm text-[var(--text-4)] uppercase tracking-widest font-semibold">Live Operations Board</p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/dashboard/bookings/new" className="px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover-lift transition-all" style={{ background: 'var(--btn)', color: 'var(--btn-fg)' }}>
            + New Operation
          </Link>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
        
        {activeStatuses.map(statusCfg => {
          const group = opsByStatus.get(statusCfg.value) ?? []
          
          return (
            <div key={statusCfg.value} className="flex flex-col shrink-0 w-[340px] snap-center">
              
              {/* Column Header */}
              <div className="glass-panel p-4 mb-4 flex items-center justify-between" style={{ borderTop: `4px solid ${statusCfg.color_fg}` }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: statusCfg.color_fg }} />
                  <h3 className="font-bold text-[var(--text)] uppercase tracking-widest text-xs m-0">{statusCfg.label}</h3>
                </div>
                <span className="font-mono font-bold text-[13px] px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-2)]">{group.length}</span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-3 pr-2 pb-12">
                <AnimatedList>
                  {group.map((op, i) => (
                    <AnimatedItem key={op.operation_id} delay={i * 0.05}>
                      <Link 
                        href={`/dashboard/bookings/${op.operation_id}`} 
                        className="block glass-panel hover-lift p-5 text-[var(--text)] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.015)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)]"
                        style={{ textDecoration: 'none', borderRadius: '16px' }}
                      >
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <h4 className="font-bold text-[15px] tracking-tight leading-tight m-0">{op.client_name}</h4>
                          <span className="text-[10px] font-mono tracking-widest px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-3)]">
                            #{op.reference}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-2)' }}>
                            {op.primary_service}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-end border-t border-[var(--line-inner)] pt-3 mt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-0.5">Value</span>
                            <span className="text-[13px] font-black text-[var(--link)] tracking-tight">₦{op.total_revenue.toLocaleString('en-NG')}</span>
                          </div>
                          {op.session_date && (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-0.5">Scheduled</span>
                              <span className="text-[12px] font-bold text-[var(--text-2)]">{fmtTime(op.session_date)}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </AnimatedItem>
                  ))}
                  {group.length === 0 && (
                    <div className="p-8 text-center border border-dashed border-[var(--line-inner)] rounded-[16px] text-[var(--text-4)] text-sm font-medium">
                      Drop area empty
                    </div>
                  )}
                </AnimatedList>
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
