'use server'

import { z } from 'zod'
import { getStudioContext, ownsBooking, ownsClient, ownsPackage, ownsStaff } from '@/lib/studio'

const addSessionSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  session_type: z.string().min(1, 'Session type is required'),
  service_type: z.string().optional().default('photo'),
  session_date: z.string().min(1, 'Session date is required'),
  package_id: z.string().optional().default(''),
  outfits_count: z.string().optional().default(''),
  location_address: z.string().optional().default(''),
  event_name: z.string().optional().default(''),
  event_date: z.string().optional().default(''),
  drive_link: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  photographer_id: z.string().optional().default(''),
  editor_id: z.string().optional().default(''),
  edited_photos: z.string().optional().default(''),
  shoot_type: z.string().optional().default(''),
  force_duplicate: z.boolean().optional().default(false),
})

export async function addSession(form: {
  client_id: string
  session_type: string
  service_type: string
  session_date: string
  package_id: string
  outfits_count: string
  location_address: string
  event_name: string
  event_date: string
  drive_link: string
  notes: string
  photographer_id: string
  editor_id: string
  edited_photos: string
  shoot_type: string
  force_duplicate?: boolean
}) {
  const result = addSessionSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsClient(context.admin, context.studioId, form.client_id))) {
    return { error: 'Client not found' }
  }

  if (form.package_id && !(await ownsPackage(context.admin, context.studioId, form.package_id))) {
    return { error: 'Package not found' }
  }

  if (form.photographer_id && !(await ownsStaff(context.admin, context.studioId, form.photographer_id))) {
    return { error: 'Staff member not found' }
  }
  if (form.editor_id && !(await ownsStaff(context.admin, context.studioId, form.editor_id))) {
    return { error: 'Staff member not found' }
  }

  // Soft duplicate check — same client, same date, not cancelled
  // Returns a warning ID so the form can ask "are you sure?" before proceeding
  const { data: dupSession } = await context.admin
    .from('bookings')
    .select('booking_id')
    .eq('studio_id', context.studioId)
    .eq('client_id', form.client_id)
    .eq('session_date', form.session_date)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (dupSession && !form.force_duplicate) {
    return { error: '__DUPLICATE__', duplicateId: dupSession.booking_id }
  }

  // Compute next booking_ref for this studio (app-level, since no DB trigger is guaranteed)
  const { data: maxRefRow } = await context.admin
    .from('bookings')
    .select('booking_ref')
    .eq('studio_id', context.studioId)
    .not('booking_ref', 'is', null)
    .order('booking_ref', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextRef = ((maxRefRow?.booking_ref as number | null) ?? 0) + 1

  const insertData: Record<string, string | number | null> = {
    client_id: form.client_id,
    session_date: form.session_date,
    studio_id: context.studioId,
    status: 'confirmed', // staff-created sessions skip pending_confirmation
    notes: form.notes || null,
    booking_ref: nextRef,
  }

  if (form.session_type) insertData.session_type = form.session_type
  if (form.service_type) insertData.service_type = form.service_type
  if (form.location_address) insertData.location_address = form.location_address
  if (form.package_id) insertData.package_id = form.package_id
  if (form.outfits_count) insertData.outfits_count = parseInt(form.outfits_count, 10)
  if (form.edited_photos) insertData.edited_photos = parseInt(form.edited_photos, 10)
  if (form.event_name) insertData.event_name = form.event_name
  if (form.event_date) insertData.event_date = form.event_date

  const { data: session, error } = await context.admin
    .from('bookings')
    .insert(insertData)
    .select()
    .single()

  if (error || !session) return { error: error?.message ?? 'Failed to create session' }

  const staffAssignments: { booking_id: string; staff_id: string; role: string }[] = []
  if (form.photographer_id) staffAssignments.push({ booking_id: session.booking_id, staff_id: form.photographer_id, role: 'photographer' })
  // Only add editor if it's a different person — same person can't have two rows for the same booking
  if (form.editor_id && form.editor_id !== form.photographer_id) {
    staffAssignments.push({ booking_id: session.booking_id, staff_id: form.editor_id, role: 'editor' })
  }
  if (staffAssignments.length > 0) {
    const { error: staffError } = await context.admin.from('booking_staff').insert(staffAssignments)
    if (staffError) return { error: staffError.message }
  }

  return { error: null, sessionId: session.booking_id }
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
  return { error: error?.message ?? null }
}

export async function bulkUpdateSessionStatus(sessionIds: string[], status: string) {
  if (!sessionIds.length) return { error: 'No sessions selected' }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // Verify all sessions belong to this studio
  const { data: owned } = await context.admin
    .from('bookings')
    .select('booking_id')
    .eq('studio_id', context.studioId)
    .in('booking_id', sessionIds)

  const ownedIds = (owned ?? []).map(b => b.booking_id)
  if (ownedIds.length !== sessionIds.length) return { error: 'One or more sessions not found' }

  const { error } = await context.admin
    .from('bookings')
    .update({ status })
    .in('booking_id', ownedIds)

  if (error) return { error: error.message }

  const { revalidatePath } = await import('next/cache')
  revalidatePath('/dashboard/sessions')
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

  // Run both ownership checks in parallel instead of sequentially
  const [bookingOk, staffOk] = await Promise.all([
    ownsBooking(context.admin, context.studioId, sessionId),
    ownsStaff(context.admin, context.studioId, staffId),
  ])
  if (!bookingOk) return { error: 'Session not found' }
  if (!staffOk)   return { error: 'Staff member not found' }

  const { error } = await context.admin
    .from('booking_staff')
    .upsert({ booking_id: sessionId, staff_id: staffId, role }, { onConflict: 'booking_id,staff_id' })
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

  // Verify ownership before touching anything
  const { data: booking } = await context.admin
    .from('bookings')
    .select('booking_id')
    .eq('booking_id', sessionId)
    .eq('studio_id', context.studioId)
    .single()
  if (!booking) return { error: 'Session not found' }

  const db = context.admin

  // 1. payments → invoices → booking
  const { data: invoices } = await db
    .from('invoices')
    .select('invoice_id')
    .eq('booking_id', sessionId)
  const invoiceIds = (invoices ?? []).map((i: { invoice_id: string }) => i.invoice_id)
  if (invoiceIds.length) {
    await db.from('payments').delete().in('invoice_id', invoiceIds)
    await db.from('invoices').delete().in('invoice_id', invoiceIds)
  }

  // 2. gallery_photos → galleries → booking
  const { data: galleries } = await db
    .from('galleries')
    .select('gallery_id')
    .eq('booking_id', sessionId)
  const galleryIds = (galleries ?? []).map((g: { gallery_id: string }) => g.gallery_id)
  if (galleryIds.length) {
    await db.from('gallery_photos').delete().in('gallery_id', galleryIds)
    await db.from('galleries').delete().in('gallery_id', galleryIds)
  }

  // 3. print_order_items → print_orders → booking
  const { data: printOrders } = await db
    .from('print_orders')
    .select('order_id')
    .eq('booking_id', sessionId)
  const orderIds = (printOrders ?? []).map((o: { order_id: string }) => o.order_id)
  if (orderIds.length) {
    await db.from('print_order_items').delete().in('order_id', orderIds)
    await db.from('print_orders').delete().in('order_id', orderIds)
  }

  // 4. Direct booking children
  await db.from('contracts').delete().eq('booking_id', sessionId)
  await db.from('booking_staff').delete().eq('booking_id', sessionId)
  await db.from('booking_addons').delete().eq('booking_id', sessionId)

  // 5. Finally delete the booking itself
  const { error } = await db
    .from('bookings')
    .delete()
    .eq('booking_id', sessionId)

  if (!error) {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/dashboard/sessions')
  }
  return { error: error?.message ?? null }
}

export async function recordSelections(sessionId: string, count: number) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { error } = await context.admin
    .from('bookings')
    .update({ selections_count: count, status: 'editing' })
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
    return { clients: [], packages: [], staff: [] }
  }

  const [{ data: clients }, { data: packages }, { data: staff }] = await Promise.all([
    context.admin.from('clients').select('client_id, full_name, phone').eq('studio_id', context.studioId).order('full_name'),
    context.admin.from('packages').select('package_id, name, base_price, session_type, outfits_count, edited_photos').eq('studio_id', context.studioId).order('name'),
    context.admin.from('staff').select('staff_id, full_name, role').eq('studio_id', context.studioId).order('full_name'),
  ])

  return {
    clients: clients ?? [],
    packages: packages ?? [],
    staff: staff ?? [],
  }
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

  return { error: error?.message ?? null }
}

export async function updateSession(sessionId: string, form: {
  client_id: string
  session_type: string
  service_type: string
  session_date: string
  package_id: string
  outfits_count: string
  edited_photos: string
  location_address: string
  event_name: string
  event_date: string
  notes: string
  photographer_id: string
  editor_id: string
  videographer_id?: string
  video_editor_id?: string
}) {
  if (!form.client_id || !form.session_date) return { error: 'Client and session date are required' }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsBooking(context.admin, context.studioId, sessionId))) return { error: 'Session not found' }
  if (!(await ownsClient(context.admin, context.studioId, form.client_id)))  return { error: 'Client not found' }
  if (form.package_id && !(await ownsPackage(context.admin, context.studioId, form.package_id))) return { error: 'Package not found' }
  if (form.photographer_id && !(await ownsStaff(context.admin, context.studioId, form.photographer_id))) return { error: 'Photographer not found' }
  if (form.editor_id && !(await ownsStaff(context.admin, context.studioId, form.editor_id)))       return { error: 'Editor not found' }

  const updateData: Record<string, string | number | null> = {
    client_id:    form.client_id,
    session_date: form.session_date,
    session_type: form.session_type,
    service_type: form.service_type || 'photo',
    notes:        form.notes || null,
    package_id:   form.package_id   || null,
    outfits_count: form.outfits_count ? parseInt(form.outfits_count, 10) : null,
    edited_photos: form.edited_photos ? parseInt(form.edited_photos, 10) : null,
    location_address: form.location_address || null,
    event_name:   form.event_name   || null,
    event_date:   form.event_date   || null,
  }

  const { error: updateError } = await context.admin
    .from('bookings')
    .update(updateData)
    .eq('booking_id', sessionId)

  if (updateError) return { error: updateError.message }

  // Replace crew assignments — delete all then re-insert
  const isPhotoVideo = form.service_type === 'photo_video'
  const rolesToDelete = isPhotoVideo
    ? ['photographer', 'editor', 'videographer', 'video_editor']
    : ['photographer', 'editor']

  await context.admin
    .from('booking_staff')
    .delete()
    .eq('booking_id', sessionId)
    .in('role', rolesToDelete)

  const assignments: { booking_id: string; staff_id: string; role: string }[] = []
  const usedStaffIds = new Set<string>()

  function addStaff(staffId: string | undefined, role: string) {
    if (!staffId) return
    assignments.push({ booking_id: sessionId, staff_id: staffId, role })
    usedStaffIds.add(staffId)
  }

  if (isPhotoVideo) {
    addStaff(form.photographer_id, 'photographer')
    addStaff(form.editor_id, 'editor')
    addStaff(form.videographer_id, 'videographer')
    addStaff(form.video_editor_id, 'video_editor')
  } else {
    addStaff(form.photographer_id, 'photographer')
    // editor can't be the same person as photographer
    if (form.editor_id && form.editor_id !== form.photographer_id) {
      addStaff(form.editor_id, 'editor')
    }
  }

  if (assignments.length > 0) {
    const { error: staffError } = await context.admin.from('booking_staff').insert(assignments)
    if (staffError) return { error: staffError.message }
  }

  return { error: null }
}
