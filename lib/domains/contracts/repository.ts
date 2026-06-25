import { SupabaseClient } from '@supabase/supabase-js'
import {
  ContractListDTO,
  ContractStatsDTO,
  NoContractBookingDTO,
  ContractDetailDTO,
  BookingOptionDTO,
} from './types'

export async function getContractStats(
  supabase: SupabaseClient,
  studioId: string
): Promise<ContractStatsDTO> {
  const [
    { count: totalContracts },
    { count: signedCount },
    { count: sentCount },
    { count: voidCount },
  ] = await Promise.all([
    supabase.from('contracts')
      .select('*, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId),
    supabase.from('contracts')
      .select('*, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId).eq('status', 'signed'),
    supabase.from('contracts')
      .select('*, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId).eq('status', 'sent'),
    supabase.from('contracts')
      .select('*, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId).eq('status', 'void'),
  ])

  const total = totalContracts ?? 0
  const signed = signedCount ?? 0
  const awaiting = sentCount ?? 0
  const voided = voidCount ?? 0
  const signRate = total > 0 ? Math.round((signed / total) * 100) : 0

  return { total, signed, awaiting, voided, signRate }
}

export async function getContractsList(
  supabase: SupabaseClient,
  studioId: string,
  params: { status?: string; limit?: number; offset?: number; orderBy?: string; ascending?: boolean } = {}
): Promise<{ data: ContractListDTO[]; count: number }> {
  let q = supabase
    .from('contracts')
    .select('contract_id, created_at, signed_by, status, bookings!inner(booking_id, booking_ref, sessions(session_date, session_type), clients(full_name), studio_id)', { count: 'exact' })
    .eq('bookings.studio_id', studioId)

  if (params.status) q = q.eq('status', params.status)
  
  if (params.orderBy) {
    q = q.order(params.orderBy, { ascending: params.ascending ?? false })
  } else {
    q = q.order('created_at', { ascending: false })
  }

  if (params.limit) {
    if (params.offset !== undefined) {
      q = q.range(params.offset, params.offset + params.limit - 1)
    } else {
      q = q.limit(params.limit)
    }
  }

  const { data: raw, count } = await q
  const contracts = (raw ?? []) as any[]

  const mapped = contracts.map(c => ({
    contract_id: c.contract_id,
    created_at: c.created_at,
    signed_by: c.signed_by,
    status: c.status,
    client_name: c.bookings?.clients?.full_name ?? null,
    booking_ref: c.bookings?.booking_ref ?? null,
    booking_id: c.bookings?.booking_id ?? null,
    session_date: c.bookings?.sessions?.[0]?.session_date ?? null,
    session_type: c.bookings?.sessions?.[0]?.session_type ?? null,
  }))

  return { data: mapped, count: count ?? 0 }
}

export async function getBookingsWithoutContracts(
  supabase: SupabaseClient,
  studioId: string,
  terminalStatuses: string[]
): Promise<NoContractBookingDTO[]> {
  const excludeIn = terminalStatuses.length ? `(${terminalStatuses.map(v => `"${v}"`).join(',')})` : '("__none__")'

  const [{ data: activeRaw }, { data: contractedRaw }] = await Promise.all([
    supabase
      .from('bookings')
      .select('booking_id, booking_ref, status, clients(full_name), sessions(session_date, session_type)')
      .eq('studio_id', studioId)
      .not('status', 'in', excludeIn)
      .limit(500),
    supabase
      .from('contracts')
      .select('booking_id, bookings!inner(studio_id)')
      .eq('bookings.studio_id', studioId),
  ])

  const activeBookings = (activeRaw ?? []) as any[]
  const contractedIds = new Set(
    ((contractedRaw ?? []) as any[]).map((r) => r.booking_id).filter(Boolean)
  )
  const noContract = activeBookings.filter(b => !contractedIds.has(b.booking_id))
  
  noContract.sort((a, b) => {
    const aDate = a.sessions?.[0]?.session_date ?? ''
    const bDate = b.sessions?.[0]?.session_date ?? ''
    return bDate.localeCompare(aDate)
  })

  return noContract.map(b => ({
    booking_id: b.booking_id,
    booking_ref: b.booking_ref,
    status: b.status,
    client_name: b.clients?.full_name ?? null,
    session_date: b.sessions?.[0]?.session_date ?? null,
    session_type: b.sessions?.[0]?.session_type ?? null,
  }))
}

export async function getContractDetail(
  supabase: SupabaseClient,
  studioId: string,
  contractId: string
): Promise<ContractDetailDTO | null> {
  const { data: raw } = await supabase
    .from('contracts')
    .select(`
      *,
      bookings!inner(
        booking_id, booking_ref, studio_id,
        sessions ( session_date, location_address ),
        clients ( client_id, full_name, email ),
        packages ( name )
      )
    `)
    .eq('contract_id', contractId)
    .eq('bookings.studio_id', studioId)
    .single()

  if (!raw) return null

  return {
    contract_id: raw.contract_id,
    status: raw.status,
    content: raw.content,
    signed_at: raw.signed_at,
    signed_by: raw.signed_by,
    client_id: raw.bookings?.clients?.client_id ?? null,
    client_name: raw.bookings?.clients?.full_name ?? null,
    client_email: raw.bookings?.clients?.email ?? null,
    booking_id: raw.bookings?.booking_id ?? null,
    booking_ref: raw.bookings?.booking_ref ?? null,
    session_date: raw.bookings?.sessions?.[0]?.session_date ?? null,
    location_address: raw.bookings?.sessions?.[0]?.location_address ?? null,
  }
}

export async function getEligibleBookingsForContract(
  supabase: SupabaseClient,
  studioId: string,
  cancelStatuses: string[]
): Promise<BookingOptionDTO[]> {
  let query = supabase
    .from('bookings')
    .select('booking_id, booking_ref, sessions(session_date, session_type), status, clients(full_name, phone), packages(package_id, name, contract_template_id)')
    .eq('studio_id', studioId)

  for (const v of cancelStatuses) { 
    query = query.neq('status', v) 
  }

  const { data: rawBookings } = await query
  const bookings = (rawBookings ?? []) as any[]

  bookings.sort((a, b) => {
    const aDate = a.sessions?.[0]?.session_date ?? ''
    const bDate = b.sessions?.[0]?.session_date ?? ''
    return bDate.localeCompare(aDate)
  })

  return bookings.map(b => ({
    booking_id: b.booking_id,
    booking_ref: b.booking_ref,
    status: b.status,
    client_name: b.clients?.full_name ?? null,
    client_phone: b.clients?.phone ?? null,
    session_date: b.sessions?.[0]?.session_date ?? null,
    session_type: b.sessions?.[0]?.session_type ?? null,
    package_id: b.packages?.package_id ?? null,
    package_name: b.packages?.name ?? null,
    contract_template_id: b.packages?.contract_template_id ?? null,
  }))
}
