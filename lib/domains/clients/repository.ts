import { SupabaseClient } from '@supabase/supabase-js'
import {
  ClientListDTO,
  ClientStatsDTO,
  ClientChartDataDTO,
  ClientDetailDTO,
  ClientBookingDTO,
  ClientInvoiceDTO
} from './types'

// Helper functions for internal logic
function getTier(sessions: number) {
  if (sessions >= 10) return { label: 'VIP',       bg: '#faeeda', color: '#854f0b' }
  if (sessions >= 5)  return { label: 'Regular',   bg: '#eaf3de', color: '#3b6d11' }
  if (sessions >= 2)  return { label: 'Returning', bg: '#e6f1fb', color: '#185fa5' }
  return                     { label: 'New',       bg: '#f1efe8', color: '#5f5e5a' }
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

// ============================================================================
// READ METHODS
// ============================================================================

export async function getClientStats(supabase: SupabaseClient, studioId: string): Promise<{ stats: ClientStatsDTO, chartData: ClientChartDataDTO }> {
  const now = new Date()
  const nowTime = now.getTime()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const ninetyDaysAgo = new Date(nowTime - 90 * 86_400_000).toISOString().slice(0, 10)

  const [
    { count: totalClients },
    { count: newThisMonth },
    { data: allBookingsRaw },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('studio_id', studioId),
    supabase.from('clients').select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId).gte('created_at', monthStart),
    supabase.from('sessions')
      .select('session_id, session_date, session_type, shoot_type, bookings!inner(client_id, booking_id, status, booking_ref)')
      .eq('studio_id', studioId),
  ])

  const allBookings = (allBookingsRaw ?? []) as any[]

  // Compute per-client stats
  const sessionCountMap = new Map<string, number>()
  const lastSessionMap  = new Map<string, string>()

  for (const b of allBookings) {
    const clientId = b.bookings?.client_id
    if (!clientId) continue
    sessionCountMap.set(clientId, (sessionCountMap.get(clientId) ?? 0) + 1)
    const existing = lastSessionMap.get(clientId) ?? ''
    if ((b.session_date ?? '') > existing) {
      lastSessionMap.set(clientId, b.session_date ?? '')
    }
  }

  let returningCount = 0
  let dormantCount   = 0
  for (const [cid, count] of sessionCountMap) {
    if (count >= 2) returningCount++
    const last = lastSessionMap.get(cid)
    if (last && last < ninetyDaysAgo) dormantCount++
  }

  const tierMap = { New: 0, Returning: 0, Regular: 0, VIP: 0 }
  for (const [, cnt] of sessionCountMap) {
    const t = getTier(cnt).label as keyof typeof tierMap
    tierMap[t]++
  }
  tierMap.New += Math.max(0, (totalClients ?? 0) - sessionCountMap.size)

  // Monthly new clients
  const sixAgo = new Date()
  sixAgo.setMonth(sixAgo.getMonth() - 5)
  sixAgo.setDate(1)
  const { data: recentRaw } = await supabase
    .from('clients')
    .select('created_at')
    .eq('studio_id', studioId)
    .gte('created_at', sixAgo.toISOString().slice(0, 10))

  const countsByMo = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    countsByMo.set(key, 0)
  }
  for (const c of (recentRaw ?? []) as any[]) {
    if (!c.created_at) continue
    const key = c.created_at.slice(0, 7)
    if (countsByMo.has(key)) countsByMo.set(key, (countsByMo.get(key) ?? 0) + 1)
  }
  const monthlyNewClients = [...countsByMo.entries()].map(([key, value]) => ({
    label: new Date(key + '-01').toLocaleDateString('en-NG', { month: 'short' }),
    value,
  }))

  return {
    stats: {
      total_clients: totalClients ?? 0,
      new_this_month: newThisMonth ?? 0,
      returning_count: returningCount,
      dormant_count: dormantCount
    },
    chartData: {
      monthly_new_clients: monthlyNewClients,
      tier_distribution: tierMap
    }
  }
}

export async function getClientList(
  supabase: SupabaseClient, 
  studioId: string, 
  options: { view: string; search: string; page: number; pageSize: number }
): Promise<{ clients: ClientListDTO[], totalCount: number }> {
  const { view, search, page, pageSize } = options
  const nowTime = Date.now()
  const thirtyDaysAgo = new Date(nowTime - 30 * 86_400_000).toISOString().slice(0, 10)
  const ninetyDaysAgo = new Date(nowTime - 90 * 86_400_000).toISOString().slice(0, 10)

  // We need to fetch all bookings first to compute sessions logic, except for "all" search mode where we can do it on the fly
  const { data: allBookingsRaw } = await supabase.from('sessions')
    .select('session_id, session_date, session_type, shoot_type, bookings!inner(client_id, booking_id, status, booking_ref)')
    .eq('studio_id', studioId)

  const allBookings = (allBookingsRaw ?? []) as any[]

  const sessionCountMap = new Map<string, number>()
  const lastSessionMap  = new Map<string, string>()
  const lastTypeMap     = new Map<string, string>()

  for (const b of allBookings) {
    const clientId = b.bookings?.client_id
    if (!clientId) continue
    sessionCountMap.set(clientId, (sessionCountMap.get(clientId) ?? 0) + 1)
    const existing = lastSessionMap.get(clientId) ?? ''
    if ((b.session_date ?? '') > existing) {
      lastSessionMap.set(clientId, b.session_date ?? '')
      lastTypeMap.set(clientId, b.shoot_type ?? b.session_type ?? '')
    }
  }

  let allClients: any[] = []
  let totalCount = 0

  if (view === 'all') {
    const from = (page - 1) * pageSize
    const to   = from + pageSize - 1

    let query = supabase.from('clients').select('*', { count: 'exact' }).eq('studio_id', studioId)
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, to)
    allClients = data ?? []
    totalCount = count ?? 0
  }

  if (view === 'frequent') {
    const { data } = await supabase.from('clients').select('*').eq('studio_id', studioId).order('full_name')
    allClients = (data ?? [])
      .filter(c => (sessionCountMap.get(c.client_id) ?? 0) > 0)
      .sort((a, b) => (sessionCountMap.get(b.client_id) ?? 0) - (sessionCountMap.get(a.client_id) ?? 0))
    totalCount = allClients.length
  }

  if (view === 'recent') {
    const recentClientIds = [...new Set(
      allBookings
        .filter(b => (b.session_date ?? '') >= thirtyDaysAgo)
        .map(b => b.bookings?.client_id)
        .filter(Boolean) as string[]
    )]
    if (recentClientIds.length > 0) {
      const { data } = await supabase.from('clients').select('*').eq('studio_id', studioId).in('client_id', recentClientIds)
      const clientMap = new Map<string, any>()
      for (const c of (data ?? [])) clientMap.set(c.client_id, c)
      allClients = recentClientIds.map(id => clientMap.get(id)).filter(Boolean)
    }
    totalCount = allClients.length
  }

  if (view === 'dormant') {
    const dormantIds: string[] = []
    for (const [cid, last] of lastSessionMap) {
      if (last < ninetyDaysAgo) dormantIds.push(cid)
    }
    if (dormantIds.length > 0) {
      const { data } = await supabase.from('clients').select('*').eq('studio_id', studioId).in('client_id', dormantIds)
      allClients = (data ?? []).sort((a, b) => daysSince(lastSessionMap.get(b.client_id)) - daysSince(lastSessionMap.get(a.client_id)))
    }
    totalCount = allClients.length
  }

  // Map to DTO
  const clientsDTO = allClients.map(c => {
    const count = sessionCountMap.get(c.client_id) ?? 0
    return {
      client_id: c.client_id,
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      avatar_url: c.avatar_url,
      client_ref: c.client_ref,
      created_at: c.created_at,
      sessions_count: count,
      last_session_date: lastSessionMap.get(c.client_id) ?? null,
      last_session_type: lastTypeMap.get(c.client_id) ?? null,
      days_since_last_session: lastSessionMap.has(c.client_id) ? daysSince(lastSessionMap.get(c.client_id)) : null,
      tier: getTier(count)
    }
  })

  return { clients: clientsDTO, totalCount }
}

export async function getClientDetail(supabase: SupabaseClient, studioId: string, clientId: string): Promise<{ 
  client: ClientDetailDTO | null, 
  bookings: ClientBookingDTO[], 
  invoices: ClientInvoiceDTO[] 
}> {
  const { data: clientRaw } = await supabase
    .from('clients')
    .select('*')
    .eq('client_id', clientId)
    .eq('studio_id', studioId)
    .single()

  if (!clientRaw) return { client: null, bookings: [], invoices: [] }

  const [bookingsResult, invoicesResult] = await Promise.all([
    supabase
      .from('sessions')
      .select('session_id, session_type, session_date, bookings!inner(booking_id, booking_ref, status, packages(name))')
      .eq('bookings.client_id', clientId)
      .eq('studio_id', studioId)
      .order('session_date', { ascending: false }),
    supabase
      .from('invoices')
      .select('invoice_id, total, status, payments(amount), bookings!inner(client_id, studio_id)')
      .eq('bookings.client_id', clientId)
      .eq('bookings.studio_id', studioId)
  ])

  const bookingsRaw = (bookingsResult.data ?? []) as any[]
  const invoicesRaw = (invoicesResult.data ?? []) as any[]

  // Map invoices
  const invoicesDTO = invoicesRaw.map(inv => {
    const amountPaid = (inv.payments ?? []).reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0)
    return {
      invoice_id: inv.invoice_id,
      total: Number(inv.total ?? 0),
      status: inv.status,
      amount_paid: amountPaid
    }
  })

  // Calculate financial rollups
  const totalInvoiced = invoicesDTO
    .filter(inv => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.total, 0)
  const totalPaid = invoicesDTO.reduce((sum, inv) => sum + inv.amount_paid, 0)
  const outstanding = Math.max(0, totalInvoiced - totalPaid)

  // Map client
  const clientDTO: ClientDetailDTO = {
    client_id: clientRaw.client_id,
    client_ref: clientRaw.client_ref,
    full_name: clientRaw.full_name,
    email: clientRaw.email,
    phone: clientRaw.phone,
    address: clientRaw.address,
    avatar_url: clientRaw.avatar_url,
    total_invoiced: totalInvoiced,
    total_paid: totalPaid,
    outstanding: outstanding
  }

  // Map bookings
  const bookingsDTO = bookingsRaw.map(b => {
    return {
      session_id: b.session_id,
      session_date: b.session_date,
      session_type: b.session_type,
      booking_id: b.bookings?.booking_id,
      booking_ref: b.bookings?.booking_ref,
      status: b.bookings?.status ?? 'pending',
      package_name: b.bookings?.packages?.name ?? null
    }
  })

  return { client: clientDTO, bookings: bookingsDTO, invoices: invoicesDTO }
}

// ============================================================================
// INTERNAL QUERIES (For Service Layer)
// ============================================================================

export async function searchClientsQuery(supabase: SupabaseClient, studioId: string, query: string) {
  const { data } = await supabase
    .from('clients')
    .select('client_id, full_name, email, phone')
    .eq('studio_id', studioId)
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .order('full_name')
    .limit(6)
  
  return data ?? []
}
