import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getStatusConfig } from '@/lib/studio-config'
import { sessionName } from '@/lib/session-title'
import { buildSignedPublicLink } from '@/lib/public-links'
import { getBookingDetail } from '@/lib/domains/bookings/repository'

import CommercialModule from './modules/CommercialModule'
import LogisticsModule from './modules/LogisticsModule'
import FulfillmentModule from './modules/FulfillmentModule'
import TeamModule from './modules/TeamModule'

import SessionActions from './session-actions'
import SessionIntake from './session-intake'
import DeleteSessionButton from './delete-session-button'
import PendingActions from './pending-actions'

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const booking = await getBookingDetail(context.admin, context.studioId, id)
  if (!booking) redirect('/dashboard/bookings')

  const studioRow = await fetchStudio(context.admin, context.studioId)
  const config = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  const statusCfg = getStatusConfig(config, booking.status)

  // Dynamic pending-panel
  const sortedActive = config.bookingStatuses.filter(s => !s.is_cancellation && !s.is_terminal).sort((a, b) => a.order - b.order)
  const intakeStatus = sortedActive[0]
  const confirmStatus = sortedActive[1]?.value ?? sortedActive[0]?.value ?? 'confirmed'
  const cancelStatusCfg = config.bookingStatuses.find(s => s.is_cancellation)
  const cancelStatusVal = cancelStatusCfg?.value ?? 'cancelled'
  const isPendingIntake = !!intakeStatus && booking.status === intakeStatus.value

  // Fetch available staff for the floating action bar
  const { data: availableStaff } = await context.admin
    .from('staff')
    .select('staff_id, full_name, roles')
    .eq('studio_id', context.studioId)
    .order('full_name')

  const studio = await fetchStudio(context.admin, context.studioId)
  const studioSlug = studio?.slug ?? ''

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 md:p-8 animate-enter pb-24">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] m-0">
              {sessionName(booking.client_name, booking.booking_ref, id, booking.sessions?.[0]?.session_date)}
            </h1>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest" style={{ background: statusCfg.color_bg, color: statusCfg.color_fg }}>
              {statusCfg.label}
            </span>
          </div>
          <p className="text-sm text-[var(--text-3)] m-0 flex items-center gap-2">
            <span className="font-mono text-[13px] tracking-widest px-2 py-0.5 rounded bg-[var(--surface-2)]">
              #{booking.booking_ref ?? id.slice(0, 6)}
            </span>
            {booking.package_name && <span className="font-medium text-[var(--text-4)] uppercase tracking-wider text-[11px]">• {booking.package_name}</span>}
          </p>
        </div>
        
        <div className="flex gap-3 items-center flex-wrap">
          <Link
            href={`/dashboard/bookings/${id}/edit`}
            className="px-4 py-2 rounded-lg font-bold text-[13px] border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text)] hover-lift transition-all"
            style={{ textDecoration: 'none' }}
          >
            Edit Operation
          </Link>
          <Link
            href={buildSignedPublicLink(studioSlug, 'summary', id)}
            target="_blank"
            className="px-4 py-2 rounded-lg font-bold text-[13px] border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text)] hover-lift transition-all"
            style={{ textDecoration: 'none' }}
          >
            Client Portal ↗
          </Link>
          <DeleteSessionButton sessionId={id} />
        </div>
      </div>

      {isPendingIntake && (
        <div style={{ marginBottom: '1.5rem' }}>
          <PendingActions
            sessionId={id}
            confirmStatus={confirmStatus}
            cancelStatus={cancelStatusVal}
          />
        </div>
      )}

      {/* Grid Architecture */}
      <div className="dashboard-grid">
        <CommercialModule session={booking} />
        <LogisticsModule booking={booking} />
        <FulfillmentModule booking={booking} />
        <TeamModule booking={booking} />
      </div>

      {/* Quick intake — only shown when no invoice exists yet */}
      {!booking.invoice && (
        <div style={{ marginTop: '2rem' }}>
          <SessionIntake sessionId={id} />
        </div>
      )}

      {/* Floating Action Bar */}
      <SessionActions
        sessionId={id}
        currentStatus={booking.status}
        serviceType={booking.services?.[0]?.service_category ?? 'photo'}
        outfitsCount={booking.custom_answers?.legacy_outfits ? Number(booking.custom_answers.legacy_outfits) : null}
        invoiceId={booking.invoice?.invoice_id ?? null}
        sessions={booking.sessions ?? []}
        availableStaff={(availableStaff ?? []) as unknown as { staff_id: string; full_name: string; role?: string }[]}
        driveLink={booking.drive_link ?? ''}
      />
    </div>
  )
}
