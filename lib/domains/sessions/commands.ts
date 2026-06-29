import { SupabaseClient } from '@supabase/supabase-js'

export type CreateSessionParams = {
  booking_id: string
  studio_id: string
  session_date?: string | null
  session_type?: string | null
  location_address?: string | null
  event_name?: string | null
  event_date?: string | null
  shoot_type?: string | null
  notes?: string | null
}

export type UpdateSessionParams = Partial<Omit<CreateSessionParams, 'booking_id' | 'studio_id'>>

/**
 * Creates a physical Session (Logistics/Fulfillment) tied to a Booking.
 */
export async function createSession(
  supabase: SupabaseClient,
  params: CreateSessionParams
): Promise<{ session_id: string } | null> {
  const { data, error } = await supabase
    .from('sessions')
    .insert([params])
    .select('session_id')
    .single()

  if (error) {
    console.error('Error creating session:', error)
    return null
  }

  return { session_id: data.session_id }
}

/**
 * Updates the logistics of an existing Session.
 */
export async function updateSessionLogistics(
  supabase: SupabaseClient,
  studioId: string,
  sessionId: string,
  params: UpdateSessionParams
): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .update(params)
    .eq('session_id', sessionId)
    .eq('studio_id', studioId)

  if (error) {
    console.error('Error updating session logistics:', error)
    return false
  }

  return true
}

/**
 * Deletes a Session.
 */
export async function deleteSession(
  supabase: SupabaseClient,
  studioId: string,
  sessionId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('session_id', sessionId)
    .eq('studio_id', studioId)

  if (error) {
    console.error('Error deleting session:', error)
    return false
  }

  return true
}

/**
 * Assigns staff to a specific Session.
 */
export async function assignStaffToSession(
  supabase: SupabaseClient,
  studioId: string,
  sessionId: string,
  bookingId: string,
  staffId: string,
  role: string
): Promise<boolean> {
  const { error } = await supabase
    .from('booking_staff')
    .insert([{
      booking_id: bookingId,
      session_id: sessionId,
      staff_id: staffId,
      role: role
    }])

  if (error) {
    console.error('Error assigning staff:', error)
    return false
  }

  return true
}

/**
 * Checks out equipment for a specific Session.
 */
export async function checkoutEquipmentForSession(
  supabase: SupabaseClient,
  studioId: string,
  sessionId: string,
  bookingId: string,
  equipmentId: string,
  staffId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('equipment_checkouts')
    .insert([{
      booking_id: bookingId,
      session_id: sessionId,
      equipment_id: equipmentId,
      checked_out_by: staffId,
      status: 'pending'
    }])

  if (error) {
    console.error('Error checking out equipment:', error)
    return false
  }

  return true
}
