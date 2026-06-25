import { redirect } from 'next/navigation'
import SessionActions from './session-actions'
import SessionIntake from './session-intake'
import SessionExtras from './session-extras'
import QuickPayment from './quick-payment'
import PendingActions from './pending-actions'
import DeleteSessionButton from './delete-session-button'
import EventDateReminderButton from './event-date-reminder-button'
import SessionServices from './session-services'
import WhatsAppActions from './whatsapp-actions'
import SessionSmartForms from './session-smart-forms'
import Link from 'next/link'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getSessionTypeConfig, getServiceTypeConfig, getStatusConfig } from '@/lib/studio-config'
import { sessionName } from '@/lib/session-title'
import { buildSignedPublicLink } from '@/lib/public-links'

import { getBookingDetail } from '@/lib/domains/bookings/repository'
import type { BookingDetailDTO, StaffAssignmentDTO } from '@/lib/domains/bookings/types'

function StaffAssignment({
  member,
  label,
}: {
  member: StaffAssignmentDTO | undefined
  label: string
}) {
  return (
    <div>
      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>{label}</p>
      {member?.staff_id ? (
        <Link href={`/dashboard/staff/${member.staff_id}`} style={{ fontSize: '14px', display: 'block', margin: 0, color: 'inherit', textDecoration: 'none' }}>
          {member.staff_name}
        </Link>
      ) : (
        <p style={{ fontSize: '14px', margin: 0, color: member ? 'var(--text)' : 'var(--text-4)' }}>
          {member?.staff_name ?? 'None assigned'}
        </p>
      )}
    </div>
  )
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const session = await getBookingDetail(context.admin, context.studioId, id)
  if (!session) redirect('/dashboard/sessions')

  const studioRow = await fetchStudio(context.admin, context.studioId)
  const config = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  const invoice = session.invoice
  const gallery = session.gallery
  const printOrder = session.printOrder
  const contract = session.contract
  const bookedServices = session.services

  const amountPaid = invoice?.amount_paid ?? 0
  const balanceDue = invoice?.balance_due ?? 0

  // Fetch available staff for assignment dropdowns (session.studio_id is already available)
  const { data: availableStaff } = await context.admin
    .from('staff')
    .select('staff_id, full_name, roles')
    .eq('studio_id', context.studioId)
    .order('full_name')

  const statusCfg      = getStatusConfig(config, session.status)
  const typeCfg        = getSessionTypeConfig(config, session.session_type)
  const serviceCategory = bookedServices[0]?.service_category ?? 'photo'
  const serviceTypeCfg = getServiceTypeConfig(config, serviceCategory)

  // Dynamic pending-panel: show when session is in the first (intake) status
  const sortedActive   = config.bookingStatuses.filter(s => !s.is_cancellation && !s.is_terminal).sort((a, b) => a.order - b.order)
  const intakeStatus   = sortedActive[0]
  const confirmStatus  = sortedActive[1]?.value ?? sortedActive[0]?.value ?? 'confirmed'
  const cancelStatusCfg = config.bookingStatuses.find(s => s.is_cancellation)
  const cancelStatusVal = cancelStatusCfg?.value ?? 'cancelled'
  const isPendingIntake = !!intakeStatus && session.status === intakeStatus.value

  const isEvent        = session.session_type === 'event'
  const isOutdoor      = session.session_type === 'outdoor'
  const isVideoSession = serviceCategory === 'video' || serviceCategory === 'photo_video'

  // Category date reminder — show when event_date is within 7 days and client has email
  const isCancelled = !!statusCfg.is_cancellation
  const daysUntilEvent = (() => {
    if (!session.event_date || isCancelled) return null
    const today  = new Date(); today.setHours(0, 0, 0, 0)
    const target = new Date(session.event_date); target.setHours(0, 0, 0, 0)
    const diff   = Math.round((target.getTime() - today.getTime()) / 86_400_000)
    return diff >= 0 && diff <= 7 ? diff : null
  })()

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 4px' }}>
            {session.client_id ? (
              <Link href={`/dashboard/clients/${session.client_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {session.client_name ?? '—'}
              </Link>
            ) : (session.client_name ?? '—')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.02em' }}>{sessionName(session.client_name, session.booking_ref, id, session.session_date)}</span>
            {session.package_name ? ` · ${session.package_name}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' as const, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: serviceTypeCfg.color_bg, color: serviceTypeCfg.color_fg, fontWeight: '500', width: 'fit-content' }}>
            {serviceTypeCfg.label}
          </span>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: typeCfg.color_bg, color: typeCfg.color_fg, fontWeight: '500', width: 'fit-content' }}>
            {typeCfg.label}
          </span>
          <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: statusCfg.color_bg, color: statusCfg.color_fg, fontWeight: '500', width: 'fit-content' }}>
            {statusCfg.label}
          </span>
          <Link
            href={`/dashboard/sessions/${id}/edit`}
            style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)' }}
          >
            Edit
          </Link>
          <DeleteSessionButton sessionId={id} />
        </div>
      </div>

      {/* Pending confirmation banner — shown for the intake/pending stage */}
      {isPendingIntake && (
        <PendingActions
          sessionId={id}
          confirmStatus={confirmStatus}
          cancelStatus={cancelStatusVal}
        />
      )}

      {/* Category date reminder — shown when event_date within 7 days & client has email */}
      {daysUntilEvent !== null && session.shoot_type && session.client_email && (
        <div style={{ marginBottom: '12px' }}>
          <EventDateReminderButton
            sessionId={id}
            clientName={session.client_name ?? 'Client'}
            shootType={session.shoot_type}
            eventDate={session.event_date!}
            daysUntil={daysUntilEvent}
          />
        </div>
      )}

      {/* Client */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>CLIENT</p>
        {session.client_id ? (
          <Link href={`/dashboard/clients/${session.client_id}`} style={{ fontSize: '15px', fontWeight: '500', display: 'block', margin: '0 0 4px', color: 'inherit', textDecoration: 'none' }}>
            {session.client_name}
          </Link>
        ) : (
          <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>{session.client_name}</p>
        )}
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 2px' }}>{session.client_email}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{session.client_phone ?? '—'}</p>
        {session.client_id && (
          <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '12px', paddingTop: '12px' }}>
            <Link href={`/dashboard/clients/${session.client_id}`} style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
              View client →
            </Link>
          </div>
        )}
      </div>

      {/* Session details */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>{isVideoSession ? 'PROJECT DETAILS' : 'SESSION DETAILS'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Date</p>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {session.session_date
                ? new Date(session.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '2px 0 0' }}>
              {session.session_date
                ? new Date(session.session_date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
                : ''}
            </p>
          </div>

          {session.shoot_type && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Category</p>
              <p style={{ fontSize: '14px', margin: 0 }}>{session.shoot_type}</p>
            </div>
          )}

          {(isOutdoor || isEvent) && session.location_address && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>{isEvent ? 'Venue' : 'Location'}</p>
              <p style={{ fontSize: '14px', margin: 0 }}>{session.location_address}</p>
            </div>
          )}

          {isEvent && session.event_name && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Event</p>
              <p style={{ fontSize: '14px', margin: 0 }}>{session.event_name}</p>
              {session.event_date && (
                <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                  {new Date(session.event_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {/* Occasion date for non-event sessions (e.g. Birthday, Anniversary) */}
          {!isEvent && session.event_date && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>
                {session.shoot_type ? `${session.shoot_type} date` : 'Occasion date'}
              </p>
              <p style={{ fontSize: '14px', margin: 0 }}>
                {new Date(session.event_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          {session.selections_count != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Selections</p>
              <p style={{ fontSize: '14px', margin: 0 }}>{session.selections_count}</p>
            </div>
          )}

          {session.package_name ? (
           <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Package</p>
            {session.package_id ? (
              <Link href={`/dashboard/packages/${session.package_id}`} style={{ fontSize: '14px', display: 'block', margin: 0, color: 'inherit', textDecoration: 'none' }}>
                {session.package_name}
              </Link>
            ) : (
              <p style={{ fontSize: '14px', margin: 0 }}>{session.package_name}</p>
            )}
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '2px 0 0' }}>
              ₦{Number(session.base_price).toLocaleString()}
            </p>
          </div>
        ) : null}

          {(() => {
            const staffList    = session.staff ?? []
            const photographer  = staffList.find(s => s.role === 'photographer')
            const editor        = staffList.find(s => s.role === 'editor')
            const videographer  = staffList.find(s => s.role === 'videographer')
            const videoEditor   = staffList.find(s => s.role === 'video_editor')
            const colourGrader  = staffList.find(s => s.role === 'colour_grader')

            const isPhotoVideo = serviceCategory === 'photo_video'
            const isPureVideo  = serviceCategory === 'video'

            if (isPhotoVideo) {
              return (
                <>
                  <StaffAssignment member={photographer} label="Photographer" />
                  <StaffAssignment member={editor} label="Photo editor" />
                  <StaffAssignment member={videographer} label="Videographer" />
                  <StaffAssignment member={videoEditor} label="Video editor" />
                  {colourGrader && <StaffAssignment member={colourGrader} label="Colour grader" />}
                </>
              )
            }

            return (
              <>
                <StaffAssignment member={photographer} label={isPureVideo ? 'Videographer' : 'Photographer'} />
                <StaffAssignment member={editor} label={isPureVideo ? 'Video editor' : 'Editor'} />
                {colourGrader && <StaffAssignment member={colourGrader} label="Colour grader" />}
              </>
            )
          })()}
        </div>

        {(session.addons?.length ?? 0) > 0 && (
          <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '16px', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 8px' }}>ADD-ONS</p>
            {session.addons.map((a, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span>{a.addon_name} × {a.quantity}</span>
                <span style={{ color: 'var(--text-3)' }}>₦{(Number(a.price) * a.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {session.drive_link && (
          <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '16px', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 4px' }}>DRIVE LINK</p>
            <a href={session.drive_link} target="_blank" rel="noreferrer"
              style={{ fontSize: '13px', color: 'var(--link)' }}>
              Open in Google Drive →
            </a>
          </div>
        )}

        {session.notes && (
          <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '16px', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 4px' }}>{isVideoSession ? 'PROJECT BRIEF' : 'NOTES'}</p>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: '1.6' }}>{session.notes}</p>
          </div>
        )}
      </div>

      <SessionSmartForms services={bookedServices} customAnswers={session.custom_answers as Record<string, any>} />

      {/* WhatsApp Omnichannel Control Center */}
      <WhatsAppActions 
        phone={session.client_phone ?? null}
        clientName={session.client_name ?? null}
        balanceDue={balanceDue}
        hasInvoice={!!invoice}
        hasGallery={!!gallery}
        status={session.status ?? 'pending'}
        sessionRef={session.booking_ref ?? null}
      />

      {/* Booked services fulfillment tracking */}
      <SessionServices services={bookedServices} />

      {/* Extras — post-agreement scope additions */}
      <SessionExtras
        sessionId={id}
        extraOutfits={session.extra_outfits ?? null}
        extraPictures={session.extra_pictures ?? null}
      />

      {/* Booking Summary */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 2px' }}>BOOKING SUMMARY</p>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0 }}>View or export the full summary of selected services.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/print/summary/${id}`} target="_blank" style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--bg)' }}>
            Print PDF
          </Link>
          <Link href={buildSignedPublicLink('summary', id)} target="_blank" style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--bg)' }}>
            Public Link
          </Link>
        </div>
      </div>

      {/* Invoice + Gallery + Print orders + Contract quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 6px' }}>INVOICE</p>
          {invoice ? (
            <>
              <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>₦{Number(invoice.total).toLocaleString()}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  {invoice.status}
                  {balanceDue > 0 && ` · ₦${balanceDue.toLocaleString()} due`}
                </span>
                <Link href={`/dashboard/invoices/${invoice.invoice_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>View →</Link>
              </div>
              {balanceDue > 0 && invoice.status !== 'cancelled' && (
                <QuickPayment invoiceId={invoice.invoice_id} balanceDue={balanceDue} />
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 8px' }}>No invoice yet</p>
              <Link href={`/dashboard/invoices/new?session=${id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Create invoice →</Link>
            </>
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 6px' }}>GALLERY</p>
          {gallery ? (
            <>
              <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>{gallery.title}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{gallery.status}</span>
                <Link href={`/dashboard/galleries/${gallery.gallery_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>View →</Link>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 8px' }}>No gallery yet</p>
              <Link href={`/dashboard/galleries/new?session=${id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Create gallery →</Link>
            </>
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 6px' }}>PRINT ORDER</p>
          {printOrder ? (
            <>
              <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>
                ₦{(printOrder.total_amount ?? 0).toLocaleString()}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'capitalize' }}>{printOrder.status}</span>
                <Link href={`/dashboard/print-orders/${printOrder.order_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>View →</Link>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 8px' }}>No print order</p>
              <Link href={`/dashboard/print-orders/new?session=${id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Create order →</Link>
            </>
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 6px' }}>CONTRACT</p>
          {contract ? (
            <>
              <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px', textTransform: 'capitalize' }}>{contract.status}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  {contract.status === 'signed' ? 'Signed ✓' : contract.status === 'sent' ? 'Awaiting signature' : contract.status === 'void' ? 'Voided' : 'Draft'}
                </span>
                <Link href={`/dashboard/contracts/${contract.contract_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>View →</Link>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 8px' }}>No contract yet</p>
              <Link href={`/dashboard/contracts/new?session=${id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Create contract →</Link>
            </>
          )}
        </div>
      </div>

      {/* Quick intake — only shown when no invoice exists yet */}
      {!invoice && (
        <SessionIntake sessionId={id} />
      )}

      <SessionActions
        sessionId={id}
        currentStatus={session.status}
        serviceType={serviceCategory}
        outfitsCount={session.custom_answers?.legacy_outfits ? Number(session.custom_answers.legacy_outfits) : null}
        invoiceId={invoice?.invoice_id ?? null}
        assignedStaff={(session.staff ?? []).map((bs) => ({
          staff_id: bs.staff_id ?? '',
          full_name: bs.staff_name ?? '',
          role: bs.role ?? '',
        }))}
        availableStaff={(availableStaff ?? []) as unknown as { staff_id: string; full_name: string; role?: string }[]}
        driveLink={session.drive_link ?? ''}
      />
    </div>
  )
}
