import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'
import DashboardWidgets from './dashboard-widgets'
import { fetchActiveOperations, fetchOmnichannelFeed, FinancialMetricsDTO } from '@/lib/domains/operations/repository'

export default async function DashboardPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { admin, studioId } = context
  const studio  = await fetchStudio(admin, studioId)
  const config  = buildStudioConfig(studio?.session_types, studio?.booking_statuses, studio?.service_types)

  const now        = new Date()
  const todayStr   = now.toISOString().slice(0, 10)         // "2026-04-28"
  const todayLabel = now.toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // 1. Fetch from DTO Repositories
  const [activeOperations, omnichannelFeed] = await Promise.all([
    fetchActiveOperations(admin, studioId, 50),
    fetchOmnichannelFeed(admin, studioId, todayStr)
  ])

  // 2. Fetch light top-level counts for pending/overdue 
  const { count: pendingCount } = await admin.from('bookings')
    .select('booking_id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .eq('status', 'pending')

  const { count: overdueCount } = await admin.from('invoices')
    .select('invoice_id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .eq('status', 'overdue')

  // 3. Fake financials for now based on operations list (would be a real repo function later)
  const collected_today = omnichannelFeed.filter(e => e.source === 'web' || e.source === 'whatsapp').reduce((sum, e) => {
    const match = e.title.match(/₦([\d,]+)/)
    if (match) return sum + parseInt(match[1].replace(/,/g, ''), 10)
    return sum
  }, 0)

  const collected_week = activeOperations.reduce((sum, op) => sum + op.total_revenue, 0)
  const outstanding_balance = 0 // simplified for now

  const financials: FinancialMetricsDTO = {
    collected_today,
    collected_week,
    outstanding_balance,
    overdue_invoices_count: overdueCount || 0,
    total_sessions_week: activeOperations.length
  }

  // 4. Pipeline Status Grouping
  const pipelineMap: Record<string, number> = {}
  for (const op of activeOperations) {
    pipelineMap[op.status] = (pipelineMap[op.status] || 0) + 1
  }

  const pipelineStatuses = config.bookingStatuses
    .filter(s => pipelineMap[s.value] > 0)
    .slice(0, 4)
    .map(s => ({
      label: s.label,
      value: s.value,
      count: pipelineMap[s.value],
      color: s.color_fg
    }))

  return (
    <DashboardWidgets 
      studioName={studio?.name ?? 'My Studio'}
      todayLabel={todayLabel}
      pendingCount={pendingCount || 0}
      overdueCount={overdueCount || 0}
      activeOperations={activeOperations}
      omnichannelFeed={omnichannelFeed}
      financials={financials}
      pipelineStatuses={pipelineStatuses}
    />
  )
}
