'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmationEmail, sendStudioBookingNotification } from '@/lib/email'
import { isGallerySelectionOpen, isMatchingGalleryPhone } from '@/lib/gallery-public'
import { buildStudioConfig } from '@/lib/studio-config'
import { seedBookingServicesFromPromise } from '@/lib/booking-services'
import { bookSession } from '@/lib/services/booking-service'

const bookingRequestSchema = z.object({
  studio_id:        z.string().min(1),
  full_name:        z.string().min(2, 'Please enter your full name'),
  phone:            z.string().min(7, 'Please enter a valid phone number'),
  email:            z.string().email('Please enter a valid email').optional().or(z.literal('')),
  session_type:     z.string().min(1, 'Please select a session type'),
  preferred_date:   z.string().min(1, 'Please select a preferred date'),
  location_address: z.string().optional(),
  shoot_type:       z.string().optional(),
  event_name:       z.string().optional(),
  event_date:       z.string().optional(),
  notes:            z.string().optional(),
  custom_answers:   z.record(z.string(), z.any()).optional(),
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
  studio_id:        string
  full_name:        string
  phone:            string
  email:            string
  session_type:     string
  preferred_date:   string
  location_address: string
  shoot_type:       string
  event_name:       string
  event_date:       string
  notes:            string
  selected_service_ids?: string[]
  package_id?: string
  custom_answers?: Record<string, any>
}) {
  const result = bookingRequestSchema.safeParse({
    ...form,
    email: form.email || undefined,
  })
  if (!result.success) return { error: result.error.issues[0].message }

  const admin = createAdminClient()

  const { data: studio } = await admin
    .from('studios')
    .select('studio_id, name, email, phone, booking_statuses, session_types, service_types')
    .eq('studio_id', form.studio_id)
    .maybeSingle()

  if (!studio) return { error: 'Studio not found' }

  // Build config so status values are dynamic, not hardcoded strings
  const studioConfig = studio as PublicStudioRow & { phone?: string | null }
  const config = buildStudioConfig(
    studioConfig.session_types,
    studioConfig.booking_statuses,
    studioConfig.service_types
  )
  const cancelValues  = config.bookingStatuses.filter(s => s.is_cancellation).map(s => s.value)
  const initialStatus = config.bookingStatuses.filter(s => !s.is_cancellation).sort((a, b) => a.order - b.order)[0]?.value ?? 'pending_confirmation'

  const { bookingId, error: bookingError, bookingRef } = await bookSession(admin, {
    studio_id: form.studio_id,
    full_name: form.full_name,
    phone: form.phone,
    email: form.email,
    session_type: form.session_type,
    preferred_date: form.preferred_date,
    location_address: form.location_address,
    shoot_type: form.shoot_type,
    event_name: form.event_name,
    event_date: form.event_date,
    notes: form.notes,
    selected_service_ids: form.selected_service_ids,
    package_id: form.package_id,
    custom_answers: form.custom_answers,
    initialStatus,
    cancelValues,
  })

  if (bookingError || !bookingId) return { error: bookingError }

  // Fire confirmation emails — don't block on errors
  const emailPayload = {
    studioName:    (studio.name as string | null) ?? '',
    clientName:    form.full_name.trim(),
    sessionType:   form.session_type,
    preferredDate: form.preferred_date,
    customAnswers: form.custom_answers,
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

  // We rely on the whatsappUrl returned below for the client to click
  // so no automated WhatsApp API call is made here.

  let whatsappUrl: string | undefined = undefined
  if (studioConfig.phone) {
    const cleanPhone = studioConfig.phone.replace(/[^\d+]/g, '')
    const msg = `Hi ${studio.name}, I just submitted a booking request for a ${form.session_type} session on ${form.preferred_date}. My reference is #${bookingRef}. Let's confirm!`
    whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
  }

  return { error: null, whatsappUrl }
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
