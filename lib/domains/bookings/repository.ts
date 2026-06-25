import { SupabaseClient } from '@supabase/supabase-js'
import {
  BookingListDTO,
  BookingStatsDTO,
  BookingDetailDTO,
  StaffAssignmentDTO,
  AddonRelationDTO,
} from './types'

export async function getBookingStats(
  supabase: SupabaseClient,
  studioId: string,
  cancelValues: string[],
  excludeValues: string[]
): Promise<BookingStatsDTO> {
  const cancelIn  = cancelValues.length  ? `(${cancelValues.map(v => `"${v}"`).join(',')})` : '("__none__")'
  const excludeIn = excludeValues.length ? `(${excludeValues.map(v => `"${v}"`).join(',')})` : '("__none__")'

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { count: totalSessions },
    { count: thisMonthCount },
    { count: pipelineCount },
    cancelledResult,
  ] = await Promise.all([
    // total non-cancelled (does not filter by date, so bookings is fine)
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId).not('status', 'in', cancelIn),
    // this month active sessions
    supabase.from('sessions').select('bookings!inner(status)', { count: 'exact', head: true })
      .eq('studio_id', studioId).gte('session_date', monthStart).not('bookings.status', 'in', cancelIn),
    // active pipeline (does not filter by date)
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId).not('status', 'in', excludeIn),
    // cancelled this month
    cancelValues.length > 0
      ? supabase.from('sessions').select('bookings!inner(status)', { count: 'exact', head: true })
          .eq('studio_id', studioId).gte('session_date', monthStart).in('bookings.status', cancelValues)
      : Promise.resolve({ count: 0 }),
  ])

  return {
    total: totalSessions ?? 0,
    thisMonth: thisMonthCount ?? 0,
    pipeline: pipelineCount ?? 0,
    cancelledThisMonth: cancelledResult.count ?? 0,
  }
}

export async function getBookingsList(
  supabase: SupabaseClient,
  studioId: string,
  params: {
    status?: string
    type?: string
    category?: string
    date_from?: string
    date_to?: string
    clientIds?: string[]
    excludeStatuses?: string[]
    includeStatuses?: string[]
    limit?: number
    offset?: number
    orderBy?: string
    ascending?: boolean
  } = {}
): Promise<{ data: BookingListDTO[]; count: number }> {
  let q = supabase
    .from('sessions')
    .select('session_date, session_type, shoot_type, bookings!inner(booking_id, booking_ref, status, client_id, packages(name), clients(client_id, full_name, email))', { count: 'exact' })
    .eq('studio_id', studioId)

  if (params.status) q = q.eq('bookings.status', params.status)
  if (params.type) q = q.eq('session_type', params.type)
  if (params.category) q = q.eq('shoot_type', params.category)
  if (params.date_from) q = q.gte('session_date', params.date_from)
  if (params.date_to) q = q.lte('session_date', params.date_to + 'T23:59:59')

  if (params.clientIds && params.clientIds.length > 0) {
    q = q.in('bookings.client_id', params.clientIds)
  } else if (params.clientIds && params.clientIds.length === 0) {
    return { data: [], count: 0 }
  }

  if (params.excludeStatuses && params.excludeStatuses.length > 0) {
    q = q.not('bookings.status', 'in', `(${params.excludeStatuses.map(v => `"${v}"`).join(',')})`)
  }
  if (params.includeStatuses && params.includeStatuses.length > 0) {
    q = q.in('bookings.status', params.includeStatuses)
  }

  if (params.orderBy) {
    q = q.order(params.orderBy, { ascending: params.ascending ?? false })
  } else {
    q = q.order('session_date', { ascending: false })
  }

  if (params.limit !== undefined) {
    if (params.offset !== undefined) {
      q = q.range(params.offset, params.offset + params.limit - 1)
    } else {
      q = q.limit(params.limit)
    }
  }

  const { data: raw, count } = await q
  const rows = (raw ?? []) as any[]

  const mapped = rows.map(r => ({
    booking_id: r.bookings?.booking_id,
    booking_ref: r.bookings?.booking_ref,
    session_date: r.session_date ?? null,
    session_type: r.session_type ?? null,
    shoot_type: r.shoot_type ?? null,
    status: r.bookings?.status,
    client_id: r.bookings?.clients?.client_id ?? r.bookings?.client_id ?? null,
    client_name: r.bookings?.clients?.full_name ?? null,
    client_email: r.bookings?.clients?.email ?? null,
    package_name: r.bookings?.packages?.name ?? null,
  }))

  return { data: mapped, count: count ?? 0 }
}

export async function getBookingDetail(
  supabase: SupabaseClient,
  studioId: string,
  bookingId: string
): Promise<BookingDetailDTO | null> {
  // 1. Fetch main booking
  const { data: rawBooking } = await supabase
    .from('bookings')
    .select(`
      booking_id, booking_ref, status, notes, drive_link, selections_count, extra_outfits, extra_pictures,
      client_id, package_id, custom_answers,
      sessions ( session_date, session_type, shoot_type, location_address, event_name, event_date ),
      clients ( client_id, full_name, email, phone ),
      packages ( name, base_price ),
      booking_staff ( role, staff_id, staff ( full_name ) ),
      booking_addons ( quantity, package_addons ( name, price ) )
    `)
    .eq('booking_id', bookingId)
    .eq('studio_id', studioId)
    .single()

  if (!rawBooking) return null

  // 2. Fetch associated items
  const [{ data: invoiceRaw }, { data: galleryRaw }, { data: printOrderRaw }, { data: contractRaw }, { data: servicesRaw }] = await Promise.all([
    supabase.from('invoices').select('invoice_id, total, status, payments(amount)').eq('booking_id', bookingId).maybeSingle(),
    supabase.from('galleries').select('gallery_id, title, status').eq('booking_id', bookingId).maybeSingle(),
    supabase.from('print_orders').select('order_id, status, print_order_items(quantity, unit_price)').eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('contracts').select('contract_id, status').eq('booking_id', bookingId).maybeSingle(),
    supabase.from('booking_services').select('booking_service_id, quantity, price_at_booking, status, services(name, type, category_value, booking_fields)').eq('booking_id', bookingId)
  ])

  // Process data
  const b = rawBooking as any
  const sess = b.sessions?.[0] ?? {}
  
  const amountPaid = (invoiceRaw?.payments ?? []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
  const balanceDue = invoiceRaw ? Math.max(0, Number(invoiceRaw.total) - amountPaid) : 0

  const itemsCount = (printOrderRaw?.print_order_items ?? []).reduce((sum: number, item: any) => sum + Number(item.quantity), 0)

  return {
    booking_id: b.booking_id,
    booking_ref: b.booking_ref,
    status: b.status,
    notes: b.notes,
    drive_link: b.drive_link,
    selections_count: b.selections_count,
    extra_outfits: b.extra_outfits,
    extra_pictures: b.extra_pictures,
    
    session_date: sess.session_date ?? null,
    session_type: sess.session_type ?? null,
    shoot_type: sess.shoot_type ?? null,
    location_address: sess.location_address ?? null,
    event_name: sess.event_name ?? null,
    event_date: sess.event_date ?? null,

    client_id: b.client_id,
    client_name: b.clients?.full_name ?? null,
    client_email: b.clients?.email ?? null,
    client_phone: b.clients?.phone ?? null,

    package_id: b.package_id,
    package_name: b.packages?.name ?? null,
    base_price: b.packages?.base_price ?? null,

    custom_answers: b.custom_answers,

    staff: (b.booking_staff ?? []).map((s: any) => ({
      role: s.role,
      staff_id: s.staff_id,
      staff_name: s.staff?.full_name ?? null
    })),

    addons: (b.booking_addons ?? []).map((a: any) => ({
      quantity: a.quantity,
      addon_name: a.package_addons?.name ?? null,
      price: a.package_addons?.price ?? 0
    })),

    services: (servicesRaw ?? []).map((s: any) => ({
      booking_service_id: s.booking_service_id,
      quantity: s.quantity,
      price_at_booking: s.price_at_booking,
      status: s.status,
      service_name: s.services?.name ?? null,
      service_type: s.services?.type ?? null,
      service_category: s.services?.category_value ?? null,
      booking_fields: s.services?.booking_fields ?? null
    })),

    invoice: invoiceRaw ? {
      invoice_id: invoiceRaw.invoice_id,
      total: Number(invoiceRaw.total),
      status: invoiceRaw.status,
      amount_paid: amountPaid,
      balance_due: balanceDue
    } : null,

    gallery: galleryRaw ? {
      gallery_id: galleryRaw.gallery_id,
      title: galleryRaw.title,
      status: galleryRaw.status
    } : null,

    printOrder: printOrderRaw ? {
      order_id: printOrderRaw.order_id,
      status: printOrderRaw.status,
      item_count: (printOrderRaw.print_order_items ?? []).reduce((acc: number, item: any) => acc + (item.quantity ?? 0), 0),
      total_amount: (printOrderRaw.print_order_items ?? []).reduce((acc: number, item: any) => acc + (Number(item.unit_price) * (item.quantity ?? 0)), 0)
    } : null,

    contract: contractRaw ? {
      contract_id: contractRaw.contract_id,
      status: contractRaw.status
    } : null
  }
}

// ============================================================================
// INTERNAL QUERIES (For Service Layer)
// ============================================================================

export async function getBookingClientContact(supabase: any, studioId: string, bookingId: string) {
  const { data } = await supabase
    .from('bookings')
    .select('clients ( full_name, email )')
    .eq('booking_id', bookingId)
    .eq('studio_id', studioId)
    .single()
  
  if (!data?.clients) return null
  return data.clients as { full_name: string; email: string }
}

export async function verifyBookingOwnership(supabase: any, studioId: string, bookingIds: string[]): Promise<string[]> {
  const { data } = await supabase
    .from('bookings')
    .select('booking_id')
    .eq('studio_id', studioId)
    .in('booking_id', bookingIds)
  
  return (data ?? []).map((b: any) => b.booking_id)
}

export async function getSessionIdForBooking(supabase: any, studioId: string, bookingId: string): Promise<string | null> {
  const { data } = await supabase
    .from('sessions')
    .select('session_id')
    .eq('booking_id', bookingId)
    .eq('studio_id', studioId)
    .maybeSingle()
  return data?.session_id ?? null
}

export async function getBookingSelectionsCount(supabase: any, studioId: string, bookingId: string): Promise<number> {
  const { data } = await supabase
    .from('bookings')
    .select('selections_count')
    .eq('booking_id', bookingId)
    .eq('studio_id', studioId)
    .single()
  return data?.selections_count ?? 0
}

export async function getBookingEventDetails(supabase: any, studioId: string, bookingId: string) {
  const { data } = await supabase
    .from('bookings')
    .select('booking_id, sessions(event_date, shoot_type), clients(full_name, email)')
    .eq('booking_id', bookingId)
    .eq('studio_id', studioId)
    .single()
  
  if (!data) return null
  return {
    booking_id: data.booking_id,
    event_date: (data.sessions as any)?.[0]?.event_date ?? null,
    shoot_type: (data.sessions as any)?.[0]?.shoot_type ?? null,
    client_name: data.clients?.full_name ?? null,
    client_email: data.clients?.email ?? null
  }
}

export async function getSessionFormData(supabase: any, studioId: string) {
  const [{ data: clients }, { data: packages }, { data: staff }, { data: services }] = await Promise.all([
    supabase.from('clients').select('client_id, full_name, phone').eq('studio_id', studioId).order('full_name'),
    supabase.from('packages').select('package_id, name, base_price, session_type, shoot_type, edited_photos, package_services(service_id, is_addon, display_order, services(service_id, name, type, description, price, session_type, booking_fields))').eq('studio_id', studioId).order('name'),
    supabase.from('staff').select('staff_id, full_name, roles').eq('studio_id', studioId).order('full_name'),
    supabase.from('services').select('service_id, name, type, session_type, booking_fields').eq('studio_id', studioId).order('name'),
  ])

  return {
    clients: (clients ?? []) as { client_id: string; full_name: string; phone?: string | null }[],
    packages: (packages ?? []) as any[],
    staff: (staff ?? []) as { staff_id: string; full_name: string; roles?: string[] | null }[],
    services: (services ?? []) as any[],
  }
}
