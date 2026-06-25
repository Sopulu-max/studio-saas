import { SupabaseClient } from '@supabase/supabase-js'
import { seedBookingServicesFromPromise } from '@/lib/booking-services'
import { findOrCreateClient } from './client-service'
import { runPhase3Automation } from '@/lib/phase3-automation'

// ─── Params ───────────────────────────────────────────────────────────────────
// Supports two client resolution modes:
//   1. client_id (dashboard): client already exists — skip lookup
//   2. full_name + phone (public/WhatsApp): find-or-create the client

type BookSessionClientById = {
  client_id:  string
  full_name?: never
  phone?:     never
  email?:     never
}

type BookSessionClientByName = {
  client_id?: never
  full_name:  string
  phone:      string
  email?:     string | null
}

export type BookSessionParams = (BookSessionClientById | BookSessionClientByName) & {
  studio_id:        string
  session_type:     string
  preferred_date:   string
  location_address?: string | null
  shoot_type?:      string | null
  event_name?:      string | null
  event_date?:      string | null
  notes?:           string | null
  selected_service_ids?: string[]
  package_id?:      string | null
  custom_answers?:  any

  // These configuration values should be passed from the caller to avoid
  // unnecessary database lookups in the service
  initialStatus: string
  cancelValues:  string[]
}

// ─── Core Booking Function ────────────────────────────────────────────────────
// Used by: Dashboard (addSession), Public booking form, WhatsApp bot
// All booking creation paths must go through this function.

export async function bookSession(
  admin: SupabaseClient<any, "public", any>,
  params: BookSessionParams
): Promise<{ bookingId: string | null; sessionId: string | null; error: string | null; bookingRef: number | null }> {
  try {
    // 1. Resolve client
    let clientId: string

    if (params.client_id) {
      // Dashboard path: client_id supplied directly — no lookup needed
      clientId = params.client_id
    } else {
      // Public/WhatsApp path: find or create client by name + phone
      const { clientId: foundId, error: clientError } = await findOrCreateClient(admin, {
        studio_id: params.studio_id,
        full_name: params.full_name!,
        phone:     params.phone!,
        email:     params.email,
      })

      if (clientError || !foundId) {
        return { bookingId: null, sessionId: null, error: clientError ?? 'Failed to process client details', bookingRef: null }
      }
      clientId = foundId
    }

    // 2. Duplicate booking check
    let dupQuery = admin
      .from('bookings')
      .select('booking_id, sessions!inner(session_date)')
      .eq('studio_id', params.studio_id)
      .eq('client_id', clientId)
      .eq('sessions.session_date', params.preferred_date)

    for (const v of params.cancelValues) {
      dupQuery = dupQuery.neq('status', v)
    }
    const { data: dupBooking } = await dupQuery.maybeSingle()

    if (dupBooking) return { bookingId: null, sessionId: null, error: '__DUPLICATE__', bookingRef: null }

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

    // 4. Insert Booking (the commercial record)
    const insertData: Record<string, any> = {
      studio_id:    params.studio_id,
      client_id:    clientId,
      status:       params.initialStatus,
      notes:        params.notes?.trim() || null,
      booking_ref:  nextRef,
      custom_answers: params.custom_answers || null,
    }

    if (params.package_id)       insertData.package_id       = params.package_id

    const { data: newBookingRaw, error: bookingError } = await admin
      .from('bookings')
      .insert(insertData)
      .select('booking_id')
      .single()

    if (bookingError || !newBookingRaw) {
      return { bookingId: null, sessionId: null, error: bookingError?.message ?? 'Failed to create booking', bookingRef: null }
    }

    const newBookingId = (newBookingRaw as unknown as { booking_id: string }).booking_id

    // 5. Create the corresponding session row (logistics/scheduling)
    // One booking always starts with exactly one session.
    // Additional sessions can be added later via the sessions management UI.
    const { data: newSessionRaw, error: sessionError } = await admin
      .from('sessions')
      .insert({
        booking_id:       newBookingId,
        studio_id:        params.studio_id,
        session_date:     params.preferred_date,
        session_type:     params.session_type,
        location_address: params.location_address?.trim() || null,
        event_name:       params.event_name?.trim()       || null,
        event_date:       params.event_date               || null,
        shoot_type:       params.shoot_type?.trim()       || null,
      })
      .select('session_id')
      .single()

    if (sessionError || !newSessionRaw) {
      // Roll back the booking if session creation fails
      await admin.from('bookings').delete().eq('booking_id', newBookingId)
      return { bookingId: null, sessionId: null, error: sessionError?.message ?? 'Failed to create session', bookingRef: null }
    }

    const newSessionId = (newSessionRaw as unknown as { session_id: string }).session_id

    // 6. Seed booking_services from the selected package
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
      return { bookingId: null, sessionId: null, error: serviceSeed.error, bookingRef: null }
    }

    await runPhase3Automation(admin, params.studio_id, newBookingId, params.package_id)

    return { bookingId: newBookingId, sessionId: newSessionId, error: null, bookingRef: nextRef }
  } catch (error: any) {
    return { bookingId: null, sessionId: null, error: error.message || 'An unexpected error occurred', bookingRef: null }
  }
}
