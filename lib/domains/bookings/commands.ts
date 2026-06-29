import { SupabaseClient } from '@supabase/supabase-js'

export type CreateBookingParams = {
  studio_id: string
  client_id: string
  package_id?: string | null
  status?: string
  notes?: string | null
  custom_answers?: Record<string, any> | null
}

export type UpdateBookingCommerceParams = {
  client_id?: string
  package_id?: string | null
  status?: string
  notes?: string | null
  custom_answers?: Record<string, any> | null
  drive_link?: string | null
  selections_count?: number | null
  extra_outfits?: number | null
  extra_pictures?: number | null
}

/**
 * Creates a new Booking (Commerce Agreement).
 * This does NOT schedule a session. It only establishes the commercial relationship.
 */
export async function createBooking(
  supabase: SupabaseClient,
  params: CreateBookingParams
): Promise<{ booking_id: string } | null> {
  const payload = {
    studio_id: params.studio_id,
    client_id: params.client_id,
    package_id: params.package_id || null,
    status: params.status || 'draft',
    notes: params.notes || null,
    custom_answers: params.custom_answers || null,
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([payload])
    .select('booking_id')
    .single()

  if (error) {
    console.error('Error creating booking:', error)
    return null
  }

  return { booking_id: data.booking_id }
}

/**
 * Updates the commercial aspects of a Booking.
 */
export async function updateBookingCommerce(
  supabase: SupabaseClient,
  studioId: string,
  bookingId: string,
  params: UpdateBookingCommerceParams
): Promise<boolean> {
  // Strip out undefined fields
  const payload: Record<string, any> = {}
  if (params.client_id !== undefined) payload.client_id = params.client_id
  if (params.package_id !== undefined) payload.package_id = params.package_id
  if (params.status !== undefined) payload.status = params.status
  if (params.notes !== undefined) payload.notes = params.notes
  if (params.custom_answers !== undefined) payload.custom_answers = params.custom_answers
  if (params.drive_link !== undefined) payload.drive_link = params.drive_link
  if (params.selections_count !== undefined) payload.selections_count = params.selections_count
  if (params.extra_outfits !== undefined) payload.extra_outfits = params.extra_outfits
  if (params.extra_pictures !== undefined) payload.extra_pictures = params.extra_pictures

  const { error } = await supabase
    .from('bookings')
    .update(payload)
    .eq('booking_id', bookingId)
    .eq('studio_id', studioId)

  if (error) {
    console.error('Error updating booking commerce:', error)
    return false
  }

  return true
}

/**
 * Updates only the status of a Booking.
 */
export async function updateBookingStatus(
  supabase: SupabaseClient,
  studioId: string,
  bookingId: string,
  status: string
): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('booking_id', bookingId)
    .eq('studio_id', studioId)

  if (error) {
    console.error('Error updating booking status:', error)
    return false
  }

  return true
}

/**
 * Soft deletes or permanently deletes a booking.
 */
export async function deleteBooking(
  supabase: SupabaseClient,
  studioId: string,
  bookingId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('booking_id', bookingId)
    .eq('studio_id', studioId)

  if (error) {
    console.error('Error deleting booking:', error)
    return false
  }

  return true
}
