
'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'
import { ownsClient, ownsPackage, ownsStaff } from '@/lib/studio-ownership'
import { getSessionIdForBooking } from '@/lib/domains/bookings/repository'
import { seedBookingServicesFromPromise } from '@/lib/booking-services'

export async function editBookingAndSession(sessionId: string, form: {
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

  const bookingData: Record<string, any> = {
    client_id:        form.client_id,
    notes:            form.notes             || null,
    package_id:       form.package_id        || null,
    custom_answers:   form.custom_answers    || null,
  }

  const { error: bookingError } = await context.admin
    .from('bookings')
    .update(bookingData)
    .eq('booking_id', sessionId)
    .eq('studio_id', context.studioId)

  if (bookingError) return { error: bookingError.message }

  const sessionData: Record<string, any> = {
    session_date:     form.session_date,
    session_type:     form.session_type,
    shoot_type:       form.shoot_type        || null,
    location_address: form.location_address  || null,
    event_name:       form.event_name        || null,
    event_date:       form.event_date        || null,
  }

  const { error: sessionUpdateError } = await context.admin
    .from('sessions')
    .update(sessionData)
    .eq('session_id', actualSessionId)
    .eq('studio_id', context.studioId)

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

  revalidatePath('/dashboard/bookings/')
  revalidatePath('/dashboard/bookings')
  return { error: null }
}
