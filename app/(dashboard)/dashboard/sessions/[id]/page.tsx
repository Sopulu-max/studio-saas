import { redirect } from 'next/navigation'
import SessionActions from './session-actions'
import SessionIntake from './session-intake'
import SessionExtras from './session-extras'
import QuickPayment from './quick-payment'
import PendingActions from './pending-actions'
import DeleteSessionButton from './delete-session-button'
import Link from 'next/link'
import { getStudioContext } from '@/lib/studio'
import { buildStudioConfig, getSessionTypeConfig, getServiceTypeConfig, getStatusConfig } from '@/lib/studio-config'
import { sessionName } from '@/lib/session-title'

type SessionStaffRelation = {
  role?: string | null
  staff_id?: string | null
  staff?: { full_name?: string | null } | null
}

type SessionAddonRelation = {
  quantity: number
  package_addons?: { name?: string | null; price?: number | string | null } | null
}

type PrintOrderItemRelation = {
  quantity: number
  unit_price?: number | string | null
}


export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: session } = await context.admin
    .from('bookings')
    .select(`
      *,
      clients ( full_name, email, phone ),
      packages ( name, base_price, duration_mins ),
      booking_staff ( role, staff_id, staff ( full_name ) ),
      booking_addons ( quantity, package_addons ( name, price ) )
    `)
    .eq('booking_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!session) redirect('/dashboard/sessions')

  const { data: studioRow } = await context.admin
    .from('studios')
    .select('session_types, service_types, booking_statuses')
    .eq('studio_id', context.studioId)
    .single()
  const config = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  const { data: invoice } = await context.admin
    .from('invoices')
    .select('invoice_id, total, status, payments(amount)')
    .eq('booking_id', id)
    .single()

  const amountPaid = ((invoice?.payments as { amount: number }[] | null) ?? [])
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const balanceDue = invoice ? Math.max(0, Number(invoice.total) - amountPaid) : 0

  const { data: gallery } = await context.admin
    .from('galleries')
    .select('gallery_id, title, status')
    .eq('booking_id', id)
    .single()

  const { data: printOrder } = await context.admin
    .from('print_orders')
    .select('order_id, status, print_order_items(quantity, unit_price)')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: contract } = await context.admin
    .from('contracts')
    .select('contract_id, status')
    .eq('booking_id', id)
    .single()

  // Fetch available staff for assignment dropdowns (session.studio_id is already available)
  const { data: availableStaff } = await context.admin
    .from('staff')
    .select('staff_id, full_name, role')
    .eq('studio_id', session.studio_id ?? '')
    .order('full_name')

  const statusCfg      = getStatusConfig(config, session.status)
  const typeCfg        = getSessionTypeConfig(config, session.session_type)
  const serviceTypeCfg = getServiceTypeConfig(config, session.service_type ?? 'photo')

  const isEvent        = session.session_type === 'event'
  const isOutdoor      = session.session_type === 'outdoor'
  const isVideoSession = session.service_type === 'video' || session.service_type === 'photo_video'

  const refCode = session.booking_ref != null
    ? `#${String(session.booking_ref).padStart(4, '0')}`
    : `#${id.slice(0, 6).toUpperCase()}`

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 4px' }}>
            {session.clients?.full_name ?? '—'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.02em' }}>{sessionName(session.clients?.full_name, session.booking_ref, id, session.session_date)}</span>
            {session.packages?.name ? ` · ${session.packages.name}` : ''}
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

      {/* Pending confirmation banner */}
      {session.status === 'pending_confirmation' && (
        <PendingActions sessionId={id} />
      )}

      {/* Client */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>CLIENT</p>
        <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>{session.clients?.full_name}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 2px' }}>{session.clients?.email}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{session.clients?.phone ?? '—'}</p>
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

          {session.outfits_count != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Outfits</p>
              <p style={{ fontSize: '14px', margin: 0 }}>{session.outfits_count}</p>
            </div>
          )}

          {session.pictures_requested != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Pictures requested</p>
              <p style={{ fontSize: '14px', margin: 0 }}>{session.pictures_requested}</p>
            </div>
          )}

          {session.selections_count != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Selections</p>
              <p style={{ fontSize: '14px', margin: 0 }}>{session.selections_count}</p>
            </div>
          )}

          {session.packages?.name && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Package</p>
              <p style={{ fontSize: '14px', margin: 0 }}>{session.packages.name}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                ₦{Number(session.packages.base_price).toLocaleString()}
                {session.packages.duration_mins ? ` · ${session.packages.duration_mins} mins` : ''}
              </p>
            </div>
          )}

          {(() => {
            const staffList    = (session.booking_staff as SessionStaffRelation[]) ?? []
            const photographer  = staffList.find(s => s.role === 'photographer')
            const editor        = staffList.find(s => s.role === 'editor')
            const videographer  = staffList.find(s => s.role === 'videographer')
            const videoEditor   = staffList.find(s => s.role === 'video_editor')
            const colourGrader  = staffList.find(s => s.role === 'colour_grader')

            const isPhotoVideo = session.service_type === 'photo_video'
            const isPureVideo  = session.service_type === 'video'

            if (isPhotoVideo) {
              return (
                <>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Photographer</p>
                    <p style={{ fontSize: '14px', margin: 0, color: photographer ? 'var(--text)' : 'var(--text-4)' }}>
                      {photographer?.staff?.full_name ?? 'None assigned'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Photo editor</p>
                    <p style={{ fontSize: '14px', margin: 0, color: editor ? 'var(--text)' : 'var(--text-4)' }}>
                      {editor?.staff?.full_name ?? 'None assigned'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Videographer</p>
                    <p style={{ fontSize: '14px', margin: 0, color: videographer ? 'var(--text)' : 'var(--text-4)' }}>
                      {videographer?.staff?.full_name ?? 'None assigned'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Video editor</p>
                    <p style={{ fontSize: '14px', margin: 0, color: videoEditor ? 'var(--text)' : 'var(--text-4)' }}>
                      {videoEditor?.staff?.full_name ?? 'None assigned'}
                    </p>
                  </div>
                  {colourGrader && (
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Colour grader</p>
                      <p style={{ fontSize: '14px', margin: 0 }}>{colourGrader.staff?.full_name}</p>
                    </div>
                  )}
                </>
              )
            }

            return (
              <>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>{isPureVideo ? 'Videographer' : 'Photographer'}</p>
                  <p style={{ fontSize: '14px', margin: 0, color: photographer ? 'var(--text)' : 'var(--text-4)' }}>
                    {photographer?.staff?.full_name ?? 'None assigned'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>{isPureVideo ? 'Video editor' : 'Editor'}</p>
                  <p style={{ fontSize: '14px', margin: 0, color: editor ? 'var(--text)' : 'var(--text-4)' }}>
                    {editor?.staff?.full_name ?? 'None assigned'}
                  </p>
                </div>
                {colourGrader && (
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Colour grader</p>
                    <p style={{ fontSize: '14px', margin: 0 }}>{colourGrader.staff?.full_name}</p>
                  </div>
                )}
              </>
            )
          })()}
        </div>

        {session.booking_addons?.length > 0 && (
          <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '16px', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 8px' }}>ADD-ONS</p>
            {(session.booking_addons as SessionAddonRelation[]).map((a, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span>{a.package_addons?.name} × {a.quantity}</span>
                <span style={{ color: 'var(--text-3)' }}>₦{(Number(a.package_addons?.price) * a.quantity).toLocaleString()}</span>
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

      {/* Extras — post-agreement scope additions */}
      <SessionExtras
        sessionId={id}
        extraOutfits={session.extra_outfits ?? null}
        extraPictures={session.extra_pictures ?? null}
      />

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
                ₦{((printOrder.print_order_items as PrintOrderItemRelation[]) ?? []).reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0).toLocaleString()}
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
        serviceType={session.service_type ?? 'photo'}
        outfitsCount={session.outfits_count ?? null}
        invoiceId={invoice?.invoice_id ?? null}
        assignedStaff={((session.booking_staff as SessionStaffRelation[]) ?? []).map((bs) => ({
          staff_id: bs.staff_id ?? '',
          full_name: bs.staff?.full_name ?? '',
          role: bs.role ?? '',
        }))}
        availableStaff={availableStaff ?? []}
        driveLink={session.drive_link ?? ''}
      />
    </div>
  )
}
