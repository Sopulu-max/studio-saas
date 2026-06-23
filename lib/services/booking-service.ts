import { SupabaseClient } from '@supabase/supabase-js'
import { seedBookingServicesFromPromise } from '@/lib/booking-services'
import { findOrCreateClient } from './client-service'

export type BookSessionParams = {
  studio_id:        string
  full_name:        string
  phone:            string
  email?:           string | null
  session_type:     string
  service_type:     string
  preferred_date:   string
  outfits_count?:   number | null
  location_address?: string | null
  shoot_type?:      string | null
  event_name?:      string | null
  event_date?:      string | null
  video_duration?:  string | null
  coverage_hours?:  number | null
  crew_size?:       number | null
  notes?:           string | null
  selected_service_ids?: string[]
  package_id?:      string | null
  custom_answers?:  any
  
  // These configuration values should be passed from the caller to avoid unnecessary database lookups in the service
  initialStatus: string
  cancelValues: string[]
}

export async function bookSession(
  admin: SupabaseClient<any, "public", any>,
  params: BookSessionParams
): Promise<{ bookingId: string | null; error: string | null; bookingRef: number | null }> {
  try {
    // 1. Find or create client
    const { clientId, error: clientError } = await findOrCreateClient(admin, {
      studio_id: params.studio_id,
      full_name: params.full_name,
      phone: params.phone,
      email: params.email,
    })

    if (clientError || !clientId) {
      return { bookingId: null, error: clientError ?? 'Failed to process client details', bookingRef: null }
    }

    // 2. Duplicate booking check
    let dupQuery = admin
      .from('bookings')
      .select('booking_id')
      .eq('studio_id', params.studio_id)
      .eq('client_id', clientId)
      .eq('session_date', params.preferred_date)
    
    for (const v of params.cancelValues) { 
      dupQuery = dupQuery.neq('status', v) 
    }
    const { data: dupBooking } = await dupQuery.maybeSingle()

    if (dupBooking) return { bookingId: null, error: '__DUPLICATE__', bookingRef: null }

    // 3. Compute next booking_ref for this studio
    const { data: maxRefRow } = await admin
      .from('bookings')
      .select('booking_ref')
      .eq('studio_id', params.studio_id)
      .not('booking_ref', 'is', null)
      .order('booking_ref', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextRef = ((maxRefRow?.booking_ref as number | null) ?? 0) + 1

    // 4. Insert Booking
    const insertData: Record<string, any> = {
      studio_id:    params.studio_id,
      client_id:    clientId,
      session_type: params.session_type,
      service_type: params.service_type || 'photo',
      session_date: params.preferred_date,
      status:       params.initialStatus,
      notes:        params.notes?.trim() || null,
      booking_ref:  nextRef,
      custom_answers: params.custom_answers || null,
    }

    if (params.outfits_count) insertData.outfits_count = params.outfits_count
    if (params.location_address) insertData.location_address = params.location_address.trim()
    if (params.shoot_type) insertData.shoot_type = params.shoot_type.trim()
    if (params.event_name) insertData.event_name = params.event_name.trim()
    if (params.event_date) insertData.event_date = params.event_date
    if (params.package_id) insertData.package_id = params.package_id
    if (params.video_duration) insertData.video_duration = params.video_duration.trim()
    if (params.coverage_hours) insertData.coverage_hours = params.coverage_hours
    if (params.crew_size) insertData.crew_size = params.crew_size

    const { data: newBookingRaw, error: bookingError } = await admin
      .from('bookings')
      .insert(insertData)
      .select('booking_id')
      .single()

    if (bookingError || !newBookingRaw) {
      return { bookingId: null, error: bookingError?.message ?? 'Failed to create booking', bookingRef: null }
    }

    const newBookingId = (newBookingRaw as unknown as { booking_id: string }).booking_id

    // 5. Seed Services
    const serviceSeed = await seedBookingServicesFromPromise({
      admin,
      studioId: params.studio_id,
      bookingId: newBookingId,
      packageId: params.package_id || null,
      selectedServiceIds: params.selected_service_ids,
    })

    if (serviceSeed.error) {
      // Rollback if service seeding fails
      await admin.from('bookings').delete().eq('booking_id', newBookingId)
      return { bookingId: null, error: serviceSeed.error, bookingRef: null }
    }

    return { bookingId: newBookingId, error: null, bookingRef: nextRef }
  } catch (error: any) {
    return { bookingId: null, error: error.message || 'An unexpected error occurred', bookingRef: null }
  }
}
