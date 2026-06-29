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
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {sessionName(booking.client_name, booking.booking_ref, id, booking.sessions?.[0]?.session_date)}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.02em', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
              #{booking.booking_ref ?? id.slice(0, 6)}
            </span>
            {booking.package_name && `· ${booking.package_name}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: statusCfg.color_bg, color: statusCfg.color_fg, fontWeight: '500', width: 'fit-content' }}>
            {statusCfg.label}
          </span>
          <Link
            href={`/dashboard/bookings/${id}/edit`}
            className="glass-panel hover-lift"
            style={{ fontSize: '13px', padding: '6px 16px', color: 'var(--text-2)', textDecoration: 'none' }}
          >
            Edit Booking
          </Link>
          <Link
            href={buildSignedPublicLink(studioSlug, 'summary', id)}
            target="_blank"
            className="glass-panel hover-lift"
            style={{ fontSize: '13px', padding: '6px 16px', color: 'var(--text-2)', textDecoration: 'none' }}
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
