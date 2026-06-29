import { SupabaseClient } from '@supabase/supabase-js'

export type CalendarSessionDTO = {
  session_id: string
  session_date: string | null
  session_type: string | null
  location_address: string | null
  event_name: string | null
  event_date: string | null
  shoot_type: string | null
  booking_id: string
  client_name: string | null
  package_name: string | null
  status: string | null
}

export async function getCalendarSessions(
  supabase: SupabaseClient,
  studioId: string,
  startDate: string,
  endDate: string
): Promise<CalendarSessionDTO[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      session_id, session_date, session_type, location_address, event_name, event_date, shoot_type,
      booking_id,
      bookings ( status, clients ( full_name ), packages ( name ) )
    `)
    .eq('studio_id', studioId)
    .gte('session_date', startDate)
    .lte('session_date', endDate + 'T23:59:59')
    .order('session_date', { ascending: true })

  if (error) {
    console.error('Error fetching calendar sessions:', error)
    return []
  }

  return (data || []).map((row: any) => {
    // Unwrapping the 1:1 or N:1 relation
    const b = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings
    const client = b?.clients ? (Array.isArray(b.clients) ? b.clients[0] : b.clients) : null
    const pkg = b?.packages ? (Array.isArray(b.packages) ? b.packages[0] : b.packages) : null

    return {
      session_id: row.session_id,
      session_date: row.session_date,
      session_type: row.session_type,
      location_address: row.location_address,
      event_name: row.event_name,
      event_date: row.event_date,
      shoot_type: row.shoot_type,
      booking_id: row.booking_id,
      status: b?.status || null,
      client_name: client?.full_name || null,
      package_name: pkg?.name || null
    }
  })
}

export async function getSessionById(
  supabase: SupabaseClient,
  studioId: string,
  sessionId: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_id', sessionId)
    .eq('studio_id', studioId)
    .single()

  if (error || !data) return null
  return data
}
