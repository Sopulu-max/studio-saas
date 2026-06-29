import { SupabaseClient } from '@supabase/supabase-js'
import { unwrapRow } from '@/lib/utils'

// ─── DTO Definitions (The new Domain Models) ──────────────────────────────────
export type ServiceOperationDTO = {
  operation_id: string       // mapping to booking_id
  reference: number | null
  client_name: string | null
  status: string
  session_date: string | null
  primary_service: string | null
  service_duration: number | null
  total_revenue: number
}

export type OmnichannelEventDTO = {
  id: string
  timestamp: string
  title: string
  subtitle: string
  source: 'web' | 'whatsapp' | 'staff_app' | 'system'
  icon: string
  color: string
}

export type FinancialMetricsDTO = {
  collected_today: number
  collected_week: number
  outstanding_balance: number
  overdue_invoices_count: number
  total_sessions_week: number
}

// ─── Repository Functions ─────────────────────────────────────────────────────

/**
 * Fetches all active operations (bookings) strictly adhering to the Service-centric schema.
 * Replaces the old `fetchSessions` logic by pulling `booking_services` properly.
 */
export async function fetchActiveOperations(supabase: SupabaseClient, studioId: string, limit = 500): Promise<ServiceOperationDTO[]> {
  const query = supabase
    .from('bookings')
    .select(`
      booking_id,
      booking_ref,
      status,
      total_price,
      clients ( full_name ),
      sessions ( session_date ),
      booking_services (
        quantity,
        services ( name, duration_mins )
      )
    `)
    .eq('studio_id', studioId)
    .not('status', 'in', '("completed","delivered","cancelled","archived")')
    .order('created_at', { ascending: false })

  if (limit) query.limit(limit)

  const { data, error } = await query

  if (error || !data) return []

  return data.map(b => {
    // Safely unwrap relation arrays (Rule 15)
    const client = unwrapRow(b.clients)
    const session = Array.isArray(b.sessions) ? b.sessions[0] : b.sessions
    
    // Extract the primary service from the booking_services pivot
    const pivot = Array.isArray(b.booking_services) ? b.booking_services[0] : b.booking_services
    const service = pivot ? unwrapRow(pivot.services) : null

    return {
      operation_id: b.booking_id,
      reference: b.booking_ref,
      client_name: client?.full_name ?? 'Walk-in Client',
      status: b.status,
      session_date: session?.session_date ?? null,
      primary_service: service?.name ?? 'Standard Session',
      service_duration: service?.duration_mins ?? 60,
      total_revenue: Number(b.total_price || 0)
    }
  })
}

/**
 * Aggregates logs, payments, and check-ins into a unified timeline.
 * Emulates the Omnichannel Strategy.
 */
export async function fetchOmnichannelFeed(supabase: SupabaseClient, studioId: string, targetDateStr: string): Promise<OmnichannelEventDTO[]> {
  const events: OmnichannelEventDTO[] = []
  
  // 1. Fetch Staff Checkins
  const { data: staff } = await supabase
    .from('staff_checkins')
    .select('checked_in_at, staff!inner(full_name)')
    .eq('studio_id', studioId)
    .eq('date', targetDateStr)
    
  if (staff) {
    staff.forEach(s => {
      events.push({
        id: `checkin-${s.checked_in_at}`,
        timestamp: s.checked_in_at,
        title: `${unwrapRow(s.staff)?.full_name} Checked In`,
        subtitle: 'Logistics / Attendance',
        source: 'staff_app',
        icon: '👤',
        color: '#0369a1' // blue
      })
    })
  }

  // 2. Fetch Payments Today
  const { data: payments } = await supabase
    .from('payments')
    .select('payment_id, amount, method, paid_at, invoices(bookings(booking_ref, clients(full_name)))')
    .eq('studio_id', studioId)
    .gte('paid_at', `${targetDateStr}T00:00:00`)
    .lte('paid_at', `${targetDateStr}T23:59:59`)

  if (payments) {
    payments.forEach(p => {
      const inv = unwrapRow(p.invoices)
      const b = unwrapRow(inv?.bookings)
      const c = unwrapRow(b?.clients)
      events.push({
        id: p.payment_id,
        timestamp: p.paid_at,
        title: `₦${Number(p.amount).toLocaleString('en-NG')} Paid via ${p.method}`,
        subtitle: c?.full_name ? c.full_name : (b?.booking_ref ? `Ref #${b.booking_ref}` : 'Direct Sale'),
        source: p.method === 'transfer' ? 'whatsapp' : 'web', // Emulate WhatsApp source for transfers
        icon: '💰',
        color: '#047857' // green
      })
    })
  }

  // Sort chronological descending
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
