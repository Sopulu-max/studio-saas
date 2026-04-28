'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmationEmail, sendStudioBookingNotification } from '@/lib/email'
import { isGallerySelectionOpen, isMatchingGalleryPhone } from '@/lib/gallery-public'

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
}) {
  const result = bookingRequestSchema.safeParse({
    ...form,
    email: form.email || undefined,
  })
  if (!result.success) return { error: result.error.issues[0].message }

  const admin = createAdminClient()

  const { data: studio } = await admin
    .from('studios')
    .select('studio_id, name, email')
    .eq('studio_id', form.studio_id)
    .maybeSingle()

  if (!studio) return { error: 'Studio not found' }

  let clientId: string
  const { data: existing } = await admin
    .from('clients')
    .select('client_id')
    .eq('studio_id', form.studio_id)
    .eq('phone', form.phone.trim())
    .maybeSingle()

  if (existing) {
    clientId = existing.client_id
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
    clientId = newClient.client_id
  }

  // Duplicate booking check — same client, same date, not cancelled
  const { data: dupBooking } = await admin
    .from('bookings')
    .select('booking_id')
    .eq('studio_id', form.studio_id)
    .eq('client_id', clientId)
    .eq('session_date', form.preferred_date)
    .neq('status', 'cancelled')
    .maybeSingle()

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
    status:       'pending_confirmation',
    notes:        noteParts.length ? noteParts.join('\n\n') : null,
    booking_ref:  nextRef,
  }

  if (form.outfits_count) insertData.outfits_count = parseInt(form.outfits_count, 10)
  if (form.location_address) insertData.location_address = form.location_address.trim()
  if (form.shoot_type) insertData.shoot_type = form.shoot_type.trim()
  if (form.event_name) insertData.event_name = form.event_name.trim()
  if (form.event_date) insertData.event_date = form.event_date

  const { error: bookingError } = await admin
    .from('bookings')
    .insert(insertData)

  if (bookingError) return { error: bookingError.message }

  // Fire confirmation emails — don't block on errors
  const emailPayload = {
    studioName:    studio.name ?? '',
    clientName:    form.full_name.trim(),
    sessionType:   form.session_type,
    preferredDate: form.preferred_date,
  }

  if (form.email?.trim()) {
    sendBookingConfirmationEmail({ to: form.email.trim(), ...emailPayload }).catch(() => {})
  }

  if (studio.email) {
    sendStudioBookingNotification({
      studioEmail: studio.email,
      clientPhone: form.phone.trim(),
      ...emailPayload,
    }).catch(() => {})
  }

  return { error: null }
}

export async function verifyGalleryPhone(galleryId: string, phone: string) {
  const admin = createAdminClient()

  const { data: gallery } = await admin
    .from('galleries')
    .select('booking_id, status')
    .eq('gallery_id', galleryId)
    .single()

  if (!gallery || gallery.status === 'expired') return { verified: false }

  const { data: booking } = await admin
    .from('bookings')
    .select('status, selections_count, clients(phone)')
    .eq('booking_id', gallery.booking_id)
    .single()

  if (!booking || !isGallerySelectionOpen({
    galleryStatus: gallery.status,
    bookingStatus: booking.status,
    selectionsCount: booking.selections_count,
  })) {
    return { verified: false }
  }

  return {
    verified: isMatchingGalleryPhone(
      booking.clients as unknown as { phone?: string | null } | null,
      phone,
    ),
  }
}

export async function submitSelections(galleryId: string, phone: string, count: number) {
  if (count < 1) return { error: 'Select at least one image' }

  const { verified } = await verifyGalleryPhone(galleryId, phone)
  if (!verified) return { error: 'Phone verification failed' }

  const admin = createAdminClient()

  const { data: gallery } = await admin
    .from('galleries')
    .select('booking_id, status')
    .eq('gallery_id', galleryId)
    .single()

  if (!gallery || gallery.status === 'expired') return { error: 'Gallery not found' }

  const { data: booking } = await admin
    .from('bookings')
    .select('status, selections_count')
    .eq('booking_id', gallery.booking_id)
    .single()

  if (!booking || !isGallerySelectionOpen({
    galleryStatus: gallery.status,
    bookingStatus: booking.status,
    selectionsCount: booking.selections_count,
  })) {
    return { error: 'Selections are closed for this gallery' }
  }

  const { error: bookingError } = await admin
    .from('bookings')
    .update({ selections_count: count })
    .eq('booking_id', gallery.booking_id)

  if (bookingError) return { error: bookingError.message }

  const { error: galleryError } = await admin
    .from('galleries')
    .update({ status: 'delivered' })
    .eq('gallery_id', galleryId)

  if (galleryError) return { error: galleryError.message }
  return { error: null }
}
