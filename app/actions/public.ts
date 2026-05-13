'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmationEmail, sendStudioBookingNotification } from '@/lib/email'
import { isGallerySelectionOpen, isMatchingGalleryPhone } from '@/lib/gallery-public'
import { buildStudioConfig } from '@/lib/studio-config'

const bookingRequestSchema = z.object({
  studio_id:        z.string().min(1),
  full_name:        z.string().min(2, 'Please enter your full name'),
  phone:            z.string().min(7, 'Please enter a valid phone number'),
  email:            z.string().email('Please enter a valid email').optional().or(z.literal('')),
  session_type:     z.string().min(1, 'Please select a session type'),
  service_type:     z.string().optional().default('photo'),
  preferred_date:   z.string().min(1, 'Please select a preferred date'),
  outfits_count:    z.string().optional(),
  location_address: z.string().optional(),
  shoot_type:       z.string().optional(),
  event_name:       z.string().optional(),
  event_date:       z.string().optional(),
  notes:            z.string().optional(),
})

type PublicStudioRow = {
  studio_id: string
  name?: string | null
  email?: string | null
  booking_statuses?: unknown
  session_types?: unknown
  service_types?: unknown
}

export async function submitBookingRequest(form: {
  studio_id: string
  full_name: string
  phone: string
  email: string
  session_type: string
  service_type: string
  preferred_date: string
  outfits_count: string
  location_address: string
  shoot_type: string
  event_name: string
  event_date: string
  notes: string
  selected_service_ids?: string[]
  package_id?: string
}) {
  const result = bookingRequestSchema.safeParse({
    ...form,
    email: form.email || undefined,
  })
  if (!result.success) return { error: result.error.issues[0].message }

  const admin = createAdminClient()

  const { data: studio } = await admin
    .from('studios')
    .select('studio_id, name, email, booking_statuses, session_types, service_types')
    .eq('studio_id', form.studio_id)
    .maybeSingle()

  if (!studio) return { error: 'Studio not found' }

  // Build config so status values are dynamic, not hardcoded strings
  const studioConfig = studio as PublicStudioRow
  const config = buildStudioConfig(
    studioConfig.session_types,
    studioConfig.booking_statuses,
    studioConfig.service_types
  )
  const cancelValues  = config.bookingStatuses.filter(s => s.is_cancellation).map(s => s.value)
  const initialStatus = config.bookingStatuses.filter(s => !s.is_cancellation).sort((a, b) => a.order - b.order)[0]?.value ?? 'pending_confirmation'

  let clientId: string
  const { data: existing } = await admin
    .from('clients')
    .select('client_id')
    .eq('studio_id', form.studio_id)
    .eq('phone', form.phone.trim())
    .maybeSingle()

  if (existing) {
    clientId = existing.client_id as string
  } else {
    const { data: newClient, error: clientError } = await admin
      .from('clients')
      .insert({
        studio_id: form.studio_id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
      })
      .select()
      .single()

    if (clientError || !newClient) return { error: clientError?.message ?? 'Failed to save your details' }
    clientId = newClient.client_id as string
  }

  // Duplicate booking check — same client, same date, excluding all cancellation statuses
  let dupQuery = admin
    .from('bookings')
    .select('booking_id')
    .eq('studio_id', form.studio_id)
    .eq('client_id', clientId)
    .eq('session_date', form.preferred_date)
  for (const v of cancelValues) { dupQuery = dupQuery.neq('status', v) }
  const { data: dupBooking } = await dupQuery.maybeSingle()

  if (dupBooking) return { error: '__DUPLICATE__' }

  const noteParts = [
    form.notes?.trim(),
  ].filter(Boolean)

  // Compute next booking_ref for this studio (app-level assignment)
  const { data: maxRefRow } = await admin
    .from('bookings')
    .select('booking_ref')
    .eq('studio_id', form.studio_id)
    .not('booking_ref', 'is', null)
    .order('booking_ref', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextRef = ((maxRefRow?.booking_ref as number | null) ?? 0) + 1

  const insertData: Record<string, string | number | null> = {
    studio_id:    form.studio_id,
    client_id:    clientId,
    session_type: form.session_type,
    service_type: form.service_type || 'photo',
    session_date: form.preferred_date,
    status:       initialStatus,
    notes:        noteParts.length ? noteParts.join('\n\n') : null,
    booking_ref:  nextRef,
  }

  if (form.outfits_count) insertData.outfits_count = parseInt(form.outfits_count, 10)
  if (form.location_address) insertData.location_address = form.location_address.trim()
  if (form.shoot_type) insertData.shoot_type = form.shoot_type.trim()
  if (form.event_name) insertData.event_name = form.event_name.trim()
  if (form.event_date)  insertData.event_date  = form.event_date
  if (form.package_id)  insertData.package_id  = form.package_id

  const { data: newBookingRaw, error: bookingError } = await admin
    .from('bookings')
    .insert(insertData)
    .select('booking_id')
    .single()

  if (bookingError || !newBookingRaw) return { error: bookingError?.message ?? 'Failed to create booking' }
  const newBookingId = (newBookingRaw as unknown as { booking_id: string }).booking_id

  // Insert selected services as booking_services rows
  const serviceIds = form.selected_service_ids?.filter(Boolean) ?? []
  if (serviceIds.length > 0 && newBookingId) {
    // Fetch price snapshots for the selected services
    const { data: svcs } = await admin
      .from('services')
      .select('service_id, price')
      .in('service_id', serviceIds)
      .eq('studio_id', form.studio_id)
      .eq('is_active', true)

    if (svcs && svcs.length > 0) {
      const svcRows = (svcs as { service_id: string; price: number | null }[])
      await admin.from('booking_services').insert(
        svcRows.map(s => ({
          booking_id:       newBookingId,
          service_id:       s.service_id,
          quantity:         1,
          price_at_booking: s.price ?? null,
        }))
      )
    }
  }

  // Fire confirmation emails — don't block on errors
  const emailPayload = {
    studioName:    (studio.name as string | null) ?? '',
    clientName:    form.full_name.trim(),
    sessionType:   form.session_type,
    preferredDate: form.preferred_date,
  }

  if (form.email?.trim()) {
    sendBookingConfirmationEmail({ to: form.email.trim(), ...emailPayload }).catch(() => {})
  }

  if (studio.email) {
    sendStudioBookingNotification({
      studioEmail: studio.email as string,
      clientPhone: form.phone.trim(),
      ...emailPayload,
    }).catch(() => {})
  }

  return { error: null }
}

type GalleryStatusRow = { booking_id: string; status: string | null }
type BookingSelectionRow = { status: string | null; selections_count: number | null; clients?: { phone?: string | null } | null }

export async function verifyGalleryPhone(galleryId: string, phone: string) {
  const admin = createAdminClient()

  const { data: galleryRaw } = await admin
    .from('galleries')
    .select('booking_id, status')
    .eq('gallery_id', galleryId)
    .single()

  if (!galleryRaw) return { verified: false }
  const gallery = galleryRaw as unknown as GalleryStatusRow
  if (gallery.status === 'expired') return { verified: false }

  const { data: bookingRaw } = await admin
    .from('bookings')
    .select('status, selections_count, clients(phone)')
    .eq('booking_id', gallery.booking_id)
    .single()

  if (!bookingRaw) return { verified: false }
  const booking = bookingRaw as unknown as BookingSelectionRow

  if (!isGallerySelectionOpen({
    galleryStatus: gallery.status,
    bookingStatus: booking.status,
    selectionsCount: booking.selections_count,
  })) {
    return { verified: false }
  }

  return {
    verified: isMatchingGalleryPhone(
      booking.clients as { phone?: string | null } | null,
      phone,
    ),
  }
}

export async function submitSelections(galleryId: string, phone: string, count: number) {
  if (count < 1) return { error: 'Select at least one image' }

  const { verified } = await verifyGalleryPhone(galleryId, phone)
  if (!verified) return { error: 'Phone verification failed' }

  const admin = createAdminClient()

  const { data: galleryRaw2 } = await admin
    .from('galleries')
    .select('booking_id, status')
    .eq('gallery_id', galleryId)
    .single()

  if (!galleryRaw2) return { error: 'Gallery not found' }
  const gallery2 = galleryRaw2 as unknown as GalleryStatusRow
  if (gallery2.status === 'expired') return { error: 'Gallery not found' }

  const { data: bookingRaw2 } = await admin
    .from('bookings')
    .select('status, selections_count')
    .eq('booking_id', gallery2.booking_id)
    .single()

  if (!bookingRaw2) return { error: 'Selections are closed for this gallery' }
  const booking2 = bookingRaw2 as unknown as BookingSelectionRow

  if (!isGallerySelectionOpen({
    galleryStatus: gallery2.status,
    bookingStatus: booking2.status,
    selectionsCount: booking2.selections_count,
  })) {
    return { error: 'Selections are closed for this gallery' }
  }

  const { error: bookingError } = await admin
    .from('bookings')
    .update({ selections_count: count })
    .eq('booking_id', gallery2.booking_id)

  if (bookingError) return { error: bookingError.message }

  const { error: galleryError } = await admin
    .from('galleries')
    .update({ status: 'delivered' })
    .eq('gallery_id', galleryId)

  if (galleryError) return { error: galleryError.message }
  return { error: null }
}
