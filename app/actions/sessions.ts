'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, fetchStudio, ownsBooking, ownsClient, ownsPackage, ownsStaff } from '@/lib/studio'
import { buildStudioConfig, getStatusConfig, getSessionTypeConfig } from '@/lib/studio-config'
import { sendStatusUpdateEmail, sendBookingConfirmationEmail, sendEventDateReminderEmail } from '@/lib/email'
import { seedBookingServicesFromPromise } from '@/lib/booking-services'
import { getBookingClientContact, verifyBookingOwnership, getSessionIdForBooking, getBookingSelectionsCount, getBookingEventDetails, getSessionFormData as getSessionFormDataRepo } from '@/lib/domains/bookings/repository'
import { bookSession } from '@/lib/services/booking-service'

const addSessionSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  session_type: z.string().min(1, 'Session type is required'),
  session_date: z.string().min(1, 'Session date is required'),
  package_id: z.string().optional().default(''),
  location_address: z.string().optional().default(''),
  event_name: z.string().optional().default(''),
  event_date: z.string().optional().default(''),
  drive_link: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  photographer_id: z.string().optional().default(''),
  editor_id: z.string().optional().default(''),
  videographer_id: z.string().optional().default(''),
  video_editor_id: z.string().optional().default(''),
  edited_photos: z.string().optional().default(''),
  shoot_type: z.string().optional().default(''),
  custom_answers: z.record(z.string(), z.any()).optional().default({}),
  force_duplicate: z.boolean().optional().default(false),
  selected_service_ids: z.array(z.string()).optional().default([]),
})

export async function addSession(form: {
  client_id: string
  session_type: string
  session_date: string
  package_id: string
  location_address: string
  event_name: string
  event_date: string
  notes: string
  photographer_id: string
  editor_id: string
  videographer_id?: string
  video_editor_id?: string
  custom_answers?: Record<string, any>
  force_duplicate?: boolean
  selected_service_ids?: string[]
}) {
  const result = addSessionSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // Fetch studio config so status values are dynamic, not hardcoded
  const studioRow = await fetchStudio(context.admin, context.studioId)
  const config    = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  const cancelValues   = config.bookingStatuses.filter(s => s.is_cancellation).map(s => s.value)
  const sortedActive   = config.bookingStatuses.filter(s => !s.is_cancellation && !s.is_terminal).sort((a, b) => a.order - b.order)
  // Staff-created sessions skip the intake/pending stage → start at the second active status
  const staffInitialStatus = sortedActive[1]?.value ?? sortedActive[0]?.value ?? 'confirmed'

  // Ownership checks for staff/client/package — run in parallel
  const [clientOk, pkgOk, photogOk, editorOk] = await Promise.all([
    ownsClient(context.admin, context.studioId, form.client_id),
    form.package_id      ? ownsPackage(context.admin, context.studioId, form.package_id)        : Promise.resolve(true),
    form.photographer_id ? ownsStaff(context.admin, context.studioId, form.photographer_id)     : Promise.resolve(true),
    form.editor_id       ? ownsStaff(context.admin, context.studioId, form.editor_id)           : Promise.resolve(true),
  ])

  if (!clientOk)  return { error: 'Client not found' }
  if (!pkgOk)     return { error: 'Package not found' }
  if (!photogOk)  return { error: 'Staff member not found' }
  if (!editorOk)  return { error: 'Staff member not found' }

  // ── Core booking creation — same engine as public & WhatsApp ──────────────
  const { bookingId, sessionId, error: bookingError } = await bookSession(context.admin, {
    client_id:            form.client_id,
    studio_id:            context.studioId,
    session_type:         form.session_type,
    preferred_date:       form.session_date,
    package_id:           form.package_id || null,
    location_address:     form.location_address || null,
    event_name:           form.event_name || null,
    event_date:           form.event_date || null,
    notes:                form.notes || null,
    custom_answers:       form.custom_answers || null,
    selected_service_ids: form.selected_service_ids ?? [],
    initialStatus:        staffInitialStatus,
    cancelValues,
  })

  if (bookingError) {
    if (bookingError === '__DUPLICATE__' && !form.force_duplicate) {
      return { error: '__DUPLICATE__' }
    }
    return { error: bookingError }
  }

  if (!bookingId) return { error: 'Failed to create session' }

  // ── Staff assignment (dashboard-specific — not part of public flow) ────────
  const staffAssignments: { booking_id: string; session_id: string | null; staff_id: string; role: string }[] = []
  if (form.photographer_id) staffAssignments.push({ booking_id: bookingId, session_id: sessionId, staff_id: form.photographer_id, role: 'photographer' })
  // Only add editor if it's a different person — same person can't have two rows for the same booking
  if (form.editor_id && !staffAssignments.some(s => s.staff_id === form.editor_id)) {
    staffAssignments.push({ booking_id: bookingId, session_id: sessionId, staff_id: form.editor_id, role: 'editor' })
  }
  if (form.videographer_id && !staffAssignments.some(s => s.staff_id === form.videographer_id)) {
    staffAssignments.push({ booking_id: bookingId, session_id: sessionId, staff_id: form.videographer_id, role: 'videographer' })
  }
  if (form.video_editor_id && !staffAssignments.some(s => s.staff_id === form.video_editor_id)) {
    staffAssignments.push({ booking_id: bookingId, session_id: sessionId, staff_id: form.video_editor_id, role: 'video_editor' })
  }
  if (staffAssignments.length > 0) {
    const { error: staffError } = await context.admin.from('booking_staff').insert(staffAssignments)
    if (staffError) {
      // Roll back the booking so we don't leave an orphan that triggers false duplicate warnings
      await context.admin.from('bookings').delete().eq('booking_id', bookingId)
      return { error: staffError.message }
    }
  }

  revalidatePath('/dashboard/bookings')

  // Fire-and-forget booking confirmation email — failures must never block the response
  ;(async () => {
    try {
      const clientData = await getBookingClientContact(context.admin, context.studioId, form.client_id)
      const clientEmail = clientData?.email
      if (!clientEmail) return  // no email on file — skip silently
      const typeLabel = getSessionTypeConfig(config, form.session_type).label
      await sendBookingConfirmationEmail({
        to:            clientEmail,
        clientName:    clientData?.full_name ?? 'there',
        studioName:    studioRow?.name ?? 'Your studio',
        sessionType:   typeLabel,
        preferredDate: form.session_date,
      })
    } catch { /* swallow — email is best-effort */ }
  })()

  return { error: null, sessionId: bookingId }
}

export async function updateSessionStatus(sessionId: string, status: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // Ownership check folded into the update — one fewer round trip
  const { error } = await context.admin
    .from('bookings')
    .update({ status })
    .eq('booking_id', sessionId)
    .eq('studio_id', context.studioId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/bookings/${sessionId}`)
  revalidatePath('/dashboard/bookings')

  // Fire-and-forget status update email — failures must never block the response
  ;(async () => {
    try {
      const [client, studioRow] = await Promise.all([
        getBookingClientContact(context.admin, context.studioId, sessionId),
        fetchStudio(context.admin, context.studioId),
      ])
      const clientEmail = client?.email
      if (!clientEmail) return  // no email on file — skip silently

      const config      = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)
      const statusLabel = getStatusConfig(config, status).label
      const studioName  = studioRow?.name ?? 'Your studio'

      await sendStatusUpdateEmail({
        to:          clientEmail,
        clientName:  client?.full_name ?? 'there',
        studioName,
        statusLabel,
      })
    } catch { /* swallow — email is best-effort */ }
  })()

  return { error: null }
}

export async function bulkUpdateSessionStatus(sessionIds: string[], status: string) {
  if (!sessionIds.length) return { error: 'No sessions selected' }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // Verify all sessions belong to this studio
  const ownedIds = await verifyBookingOwnership(context.admin, context.studioId, sessionIds)
  if (ownedIds.length !== sessionIds.length) return { error: 'One or more sessions not found' }

  const { error } = await context.admin
    .from('bookings')
    .update({ status })
    .in('booking_id', ownedIds)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/bookings')
  return { error: null, updated: ownedIds.length }
}

export async function updateSessionDriveLink(sessionId: string, driveLink: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { error } = await context.admin
    .from('bookings')
    .update({ drive_link: driveLink || null })
    .eq('booking_id', sessionId)
    .eq('studio_id', context.studioId)
  return { error: error?.message ?? null }
}

export async function assignSessionStaff(sessionId: string, staffId: string, role: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // Resolve actual session_id while checking ownership
  const [actualSessionId, staffOk] = await Promise.all([
    getSessionIdForBooking(context.admin, context.studioId, sessionId),
    ownsStaff(context.admin, context.studioId, staffId),
  ])
  if (!actualSessionId) return { error: 'Session not found' }
  if (!staffOk)       return { error: 'Staff member not found' }

  const { error } = await context.admin
    .from('booking_staff')
    .upsert({ booking_id: sessionId, session_id: actualSessionId || null, staff_id: staffId, role }, { onConflict: 'booking_id,staff_id' })
  return { error: error?.message ?? null }
}

export async function removeSessionStaff(sessionId: string, staffId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { error } = await context.admin
    .from('booking_staff')
    .delete()
    .eq('booking_id', sessionId)
    .eq('staff_id', staffId)
  return { error: error?.message ?? null }
}
export async function deleteSession(sessionId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // 1. Verify ownership of the booking
  const ownedIds = await verifyBookingOwnership(context.admin, context.studioId, [sessionId])
  if (!ownedIds.length) return { error: 'Session not found' }

  const db = context.admin

  // 1. payments → invoices → booking
  const { data: invoices } = await db
    .from('invoices')
    .select('invoice_id')
    .eq('booking_id', sessionId)
  const invoiceIds = (invoices ?? []).map((i: { invoice_id: unknown }) => i.invoice_id as string)
  if (invoiceIds.length) {
    await db.from('payments').delete().in('invoice_id', invoiceIds)
    await db.from('invoices').delete().in('invoice_id', invoiceIds)
  }

  // 2. gallery_photos → galleries → booking
  const { data: galleries } = await db
    .from('galleries')
    .select('gallery_id')
    .eq('booking_id', sessionId)
  const galleryIds = (galleries ?? []).map((g: { gallery_id: unknown }) => g.gallery_id as string)
  if (galleryIds.length) {
    await db.from('gallery_photos').delete().in('gallery_id', galleryIds)
    await db.from('galleries').delete().in('gallery_id', galleryIds)
  }

  // 3. print_order_items → print_orders → booking
  const { data: printOrders } = await db
    .from('print_orders')
    .select('order_id')
    .eq('booking_id', sessionId)
  const orderIds = (printOrders ?? []).map((o: { order_id: unknown }) => o.order_id as string)
  if (orderIds.length) {
    await db.from('print_order_items').delete().in('order_id', orderIds)
    await db.from('print_orders').delete().in('order_id', orderIds)
  }

  // 4. Direct booking children
  await db.from('contracts').delete().eq('booking_id', sessionId)
  await db.from('booking_staff').delete().eq('booking_id', sessionId)
  await db.from('booking_addons').delete().eq('booking_id', sessionId)
  await db.from('booking_services').delete().eq('booking_id', sessionId)

  // 4b. Null out equipment that was checked out to this booking
  // (equipment.booking_id uses ON DELETE SET NULL in the new schema, but
  //  we null it here explicitly for the legacy equipment.booking_id column
  //  that doesn't have that constraint yet)
  await db
    .from('equipment')
    .update({ booking_id: null, session_id: null, assigned_to: null, checked_out_at: null, status: 'available' })
    .eq('booking_id', sessionId)

  // 5. Finally delete the booking itself
  const { error } = await db
    .from('bookings')
    .delete()
    .eq('booking_id', sessionId)

  if (!error) revalidatePath('/dashboard/bookings')
  return { error: error?.message ?? null }
}

export async function recordSelections(sessionId: string, count: number) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // Determine the next status dynamically: the stage after requires_selection_count
  const studioRow     = await fetchStudio(context.admin, context.studioId)
  const config        = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)
  const sortedPipeline = config.bookingStatuses.filter(s => !s.is_cancellation).sort((a, b) => a.order - b.order)
  const selIdx        = sortedPipeline.findIndex(s => s.requires_selection_count)
  const nextStatus    = selIdx >= 0 && selIdx + 1 < sortedPipeline.length
    ? sortedPipeline[selIdx + 1].value
    : sortedPipeline[selIdx - 1]?.value ?? sortedPipeline[0]?.value ?? ''

  const { error } = await context.admin
    .from('bookings')
    .update({ selections_count: count, status: nextStatus })
    .eq('booking_id', sessionId)
    .eq('studio_id', context.studioId)
  return { error: error?.message ?? null }
}

export async function recordIntake(form: {
  sessionId: string
  agreedAmount: string
  paymentAmount: string
  paymentMethod: string
}) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsBooking(context.admin, context.studioId, form.sessionId))) {
    return { error: 'Session not found' }
  }

  const agreed = Math.max(0, parseFloat(form.agreedAmount) || 0)
  if (agreed === 0) return { error: 'Agreed amount must be greater than 0' }

  const paid = Math.max(0, parseFloat(form.paymentAmount) || 0)
  const invoiceStatus = paid === 0 ? 'draft' : paid >= agreed ? 'paid' : 'sent'

  const { data: invoice, error: invoiceError } = await context.admin
    .from('invoices')
    .insert({
      booking_id: form.sessionId,
      subtotal: agreed,
      discount: 0,
      tax: 0,
      total: agreed,
      status: invoiceStatus,
      issued_at: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (invoiceError || !invoice) return { error: invoiceError?.message ?? 'Failed to create invoice' }

  if (paid > 0) {
    const { error: paymentError } = await context.admin
      .from('payments')
      .insert({
        invoice_id: invoice.invoice_id,
        amount: paid,
        method: form.paymentMethod,
        paid_at: new Date().toISOString(),
      })
    if (paymentError) return { error: paymentError.message }
  }

  return { error: null, invoiceId: invoice.invoice_id }
}

export async function getSessionFormData() {
  const context = await getStudioContext()
  if ('error' in context) {
    return { clients: [], packages: [], staff: [], services: [] }
  }

  return getSessionFormDataRepo(context.admin, context.studioId)
}

export async function updateSessionScope(sessionId: string, data: {
  extra_outfits: string
  extra_pictures: string
}) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsBooking(context.admin, context.studioId, sessionId))) return { error: 'Session not found' }

  const { error } = await context.admin
    .from('bookings')
    .update({
      extra_outfits:  data.extra_outfits  ? parseInt(data.extra_outfits, 10)  : null,
      extra_pictures: data.extra_pictures ? parseInt(data.extra_pictures, 10) : null,
    })
    .eq('booking_id', sessionId)

  if (!error) revalidatePath(`/dashboard/bookings/${sessionId}`)
  return { error: error?.message ?? null }
}

export async function updateSession(sessionId: string, form: {
  client_id: string
  session_type: string
  shoot_type?: string
  session_date: string
  package_id: string
  location_address: string
  event_name: string
  event_date: string
  notes: string
  photographer_id: string
  editor_id: string
  videographer_id?: string
  video_editor_id?: string
  custom_answers?: Record<string, any>
}) {
  if (!form.client_id || !form.session_date) return { error: 'Client and session date are required' }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // All ownership checks in parallel
  const [actualSessionId, clientOk, pkgOk, photogOk, editorOk, videoOk, videoEdOk] = await Promise.all([
    getSessionIdForBooking(context.admin, context.studioId, sessionId),
    ownsClient(context.admin, context.studioId, form.client_id),
    form.package_id      ? ownsPackage(context.admin, context.studioId, form.package_id)        : Promise.resolve(true),
    form.photographer_id ? ownsStaff(context.admin, context.studioId, form.photographer_id)     : Promise.resolve(true),
    form.editor_id       ? ownsStaff(context.admin, context.studioId, form.editor_id)           : Promise.resolve(true),
    form.videographer_id ? ownsStaff(context.admin, context.studioId, form.videographer_id)     : Promise.resolve(true),
    form.video_editor_id ? ownsStaff(context.admin, context.studioId, form.video_editor_id)     : Promise.resolve(true),
  ])
  if (!actualSessionId) return { error: 'Session not found' }
  if (!clientOk)  return { error: 'Client not found' }
  if (!pkgOk)     return { error: 'Package not found' }
  if (!photogOk)  return { error: 'Photographer not found' }
  if (!editorOk)  return { error: 'Editor not found' }
  if (!videoOk)   return { error: 'Videographer not found' }
  if (!videoEdOk) return { error: 'Video Editor not found' }

  const updateData: Record<string, any> = {
    client_id:        form.client_id,
    session_date:     form.session_date,
    session_type:     form.session_type,
    shoot_type:       form.shoot_type        || null,
    notes:            form.notes             || null,
    package_id:       form.package_id        || null,
    location_address: form.location_address  || null,
    event_name:       form.event_name        || null,
    event_date:       form.event_date        || null,
    custom_answers:   form.custom_answers    || null,
  }

  const { error: updateError } = await context.admin
    .from('bookings')
    .update(updateData)
    .eq('booking_id', sessionId)

  if (updateError) return { error: updateError.message }

  const sessionUpdateData: Record<string, any> = {
    session_date:     form.session_date,
    session_type:     form.session_type,
    shoot_type:       form.shoot_type        || null,
    location_address: form.location_address  || null,
    event_name:       form.event_name        || null,
    event_date:       form.event_date        || null,
  }

  const { error: sessionUpdateError } = await context.admin
    .from('sessions')
    .update(sessionUpdateData)
    .eq('session_id', actualSessionId)

  if (sessionUpdateError) return { error: sessionUpdateError.message }

  // Replace crew assignments — delete all then re-insert
  const rolesToDelete = ['photographer', 'editor', 'videographer', 'video_editor']

  await context.admin
    .from('booking_staff')
    .delete()
    .eq('booking_id', sessionId)
    .in('role', rolesToDelete)

  const assignments: { booking_id: string; session_id: string | null; staff_id: string; role: string }[] = []

  function addStaff(staffId: string | undefined, role: string) {
    if (!staffId) return
    const sessionIdToUse = actualSessionId || null
    assignments.push({ booking_id: sessionId, session_id: sessionIdToUse, staff_id: staffId, role })
  }

  addStaff(form.photographer_id, 'photographer')
  if (form.editor_id && form.editor_id !== form.photographer_id) {
    addStaff(form.editor_id, 'editor')
  }
  if (form.videographer_id) {
    addStaff(form.videographer_id, 'videographer')
  }
  if (form.video_editor_id && form.video_editor_id !== form.videographer_id) {
    addStaff(form.video_editor_id, 'video_editor')
  }

  if (assignments.length > 0) {
    const { error: staffError } = await context.admin.from('booking_staff').insert(assignments)
    if (staffError) return { error: staffError.message }
  }

  // Re-seed booking_services whenever the package changes
  // This ensures the service records are never stale after a package edit
  if (form.package_id) {
    await context.admin.from('booking_services').delete().eq('booking_id', sessionId)
    const serviceSeed = await seedBookingServicesFromPromise({
      admin: context.admin,
      studioId: context.studioId,
      bookingId: sessionId,
      packageId: form.package_id,
      selectedServiceIds: [],
    })
    if (serviceSeed.error) return { error: serviceSeed.error }
  } else if (!form.package_id) {
    // Package was removed — clear all service records
    await context.admin.from('booking_services').delete().eq('booking_id', sessionId)
  }

  revalidatePath(`/dashboard/bookings/${sessionId}`)
  revalidatePath('/dashboard/bookings')
  return { error: null }
}

// ── Send event-date reminder email ────────────────────────────────────────────
// Fires a warm reminder to the client: "your [shoot_type] is in X days, we're
// putting the finishing touches on your photos."
export async function sendEventDateReminder(sessionId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const booking = await getBookingEventDetails(context.admin, context.studioId, sessionId)
  if (!booking) return { error: 'Session not found' }

  const clientEmail = booking.client_email
  if (!clientEmail) return { error: 'Client has no email address on file' }

  const clientName = booking.client_name ?? 'there'
  if (!booking.event_date) return { error: 'This session has no category date set' }
  if (!booking.shoot_type)  return { error: 'Session has no category type set' }

  // Compute days until event
  const today  = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(booking.event_date); target.setHours(0, 0, 0, 0)
  const days   = Math.round((target.getTime() - today.getTime()) / 86_400_000)

  if (days < 0)  return { error: 'Event date has already passed' }
  if (days > 30) return { error: 'Event date is more than 30 days away — no reminder needed yet' }

  const studioRow  = await fetchStudio(context.admin, context.studioId)
  const studioName = studioRow?.name ?? 'Your Studio'

  const { error: emailError } = await sendEventDateReminderEmail({
    to:          clientEmail,
    clientName:  clientName,
    studioName,
    shootType:   booking.shoot_type,
    eventDate:   booking.event_date,
    daysUntil:   days,
  })

  if (emailError) return { error: emailError }
  return { error: null }
}

