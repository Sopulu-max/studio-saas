import { SupabaseClient } from '@supabase/supabase-js'
import {
  StaffStatsDTO,
  StaffMemberDTO,
  StaffSessionAssignmentDTO,
  TodaySessionDTO,
  StaffDetailDTO,
  StaffAssignmentDTO,
  StaffCheckinDTO,
} from './types'

export async function getStaffStats(
  supabase: SupabaseClient,
  studioId: string
): Promise<StaffStatsDTO> {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { count: totalStaff },
    { count: sessionsThisMonth },
    { count: sessionsToday },
  ] = await Promise.all([
    supabase.from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId),
    supabase.from('booking_staff')
      .select('*, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId)
      .gte('bookings.sessions.session_date', monthStart),
    supabase.from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId)
      .eq('session_date', todayStr),
  ])

  return {
    total: totalStaff ?? 0,
    sessions_this_month: sessionsThisMonth ?? 0,
    sessions_today: sessionsToday ?? 0,
  }
}

export async function getStaffList(
  supabase: SupabaseClient,
  studioId: string,
  options?: {
    q?: string
    page?: number
    pageSize?: number
  }
): Promise<{ items: StaffMemberDTO[]; total: number }> {
  let query = supabase
    .from('staff')
    .select('*', { count: 'exact' })
    .eq('studio_id', studioId)
  if (options?.q) query = query.or(`full_name.ilike.%${options.q}%`)
  if (options?.page && options?.pageSize) {
    const from = (options.page - 1) * options.pageSize
    const to = from + options.pageSize - 1
    query = query.range(from, to)
  }

  const { data: raw, count } = await query.order('full_name', { ascending: true })

  const items = (raw ?? []).map((m: any) => ({
    staff_id: m.staff_id,
    full_name: m.full_name ?? 'Unknown',
    email: m.email ?? null,
    role: m.role ?? null,
    roles: m.roles && m.roles.length > 0 ? m.roles : m.role ? [m.role] : [],
    working_days: m.working_days ?? [],
    hire_date: m.hire_date ?? null,
    avatar_url: m.avatar_url ?? null,
  }))

  return { items, total: count ?? 0 }
}

export async function getTodaySessions(
  supabase: SupabaseClient,
  studioId: string
): Promise<TodaySessionDTO[]> {
  const todayStr = new Date().toISOString().slice(0, 10)

  const { data: raw } = await supabase
    .from('bookings')
    .select('booking_id, booking_ref, session_type, status, clients(full_name), booking_staff(role, staff(staff_id, full_name)), sessions(session_date)')
    .eq('studio_id', studioId)
    .not('sessions', 'is', null)
    .order('booking_ref', { ascending: true })

  const todayBookings = (raw ?? []).filter((b: any) => {
    const sessionDate = (b.sessions as any)?.[0]?.session_date
    return sessionDate && sessionDate.startsWith(todayStr)
  })

  return todayBookings.map((b: any) => ({
    booking_id: b.booking_id,
    booking_ref: b.booking_ref ?? null,
    session_date: (b.sessions as any)?.[0]?.session_date ?? null,
    session_type: b.session_type ?? null,
    status: b.status ?? '',
    client_name: b.clients?.full_name ?? null,
    assigned_staff: (b.booking_staff ?? []).map((bs: any) => ({
      staff_id: bs.staff?.staff_id ?? null,
      full_name: bs.staff?.full_name ?? null,
      role: bs.role ?? null,
    })),
  }))
}

export async function getStaffSessionAssignments(
  supabase: SupabaseClient,
  studioId: string,
  options?: {
    page?: number
    pageSize?: number
  }
): Promise<{ items: StaffSessionAssignmentDTO[]; total: number }> {
  let query = supabase
    .from('booking_staff')
    .select('booking_id, role, staff(staff_id, full_name), bookings!inner(booking_id, booking_ref, session_type, studio_id, clients(full_name), sessions(session_date))', { count: 'exact' })
    .eq('bookings.studio_id', studioId)
    .order('booking_id', { ascending: false })

  if (options?.page && options?.pageSize) {
    const from = (options.page - 1) * options.pageSize
    const to = from + options.pageSize - 1
    query = query.range(from, to)
  }

  const { data: raw, count } = await query

  const items = (raw ?? []).map((a: any) => ({
    booking_id: a.bookings?.booking_id ?? null,
    booking_ref: a.bookings?.booking_ref ?? null,
    session_date: (a.bookings?.sessions as any)?.[0]?.session_date ?? null,
    session_type: a.bookings?.session_type ?? null,
    client_name: a.bookings?.clients?.full_name ?? null,
    staff_name: a.staff?.full_name ?? null,
    staff_id: a.staff?.staff_id ?? null,
    role: a.role ?? null,
  }))

  return { items, total: count ?? 0 }
}

export async function getStaffDetail(
  supabase: SupabaseClient,
  studioId: string,
  staffId: string
): Promise<StaffDetailDTO | null> {
  const [{ data: memberRaw }, { data: assignmentsRaw }, { data: checkinsRaw }] = await Promise.all([
    supabase
      .from('staff')
      .select('*')
      .eq('staff_id', staffId)
      .eq('studio_id', studioId)
      .single(),
    supabase
      .from('booking_staff')
      .select('role, bookings!inner(booking_id, booking_ref, status, studio_id, clients(full_name), sessions(session_date))')
      .eq('staff_id', staffId)
      .eq('bookings.studio_id', studioId)
      .order('booking_id', { ascending: false }),
    supabase
      .from('staff_checkins')
      .select('checkin_id, date, checked_in_at, checked_out_at')
      .eq('staff_id', staffId)
      .eq('studio_id', studioId)
      .order('date', { ascending: false })
      .limit(14),
  ])

  if (!memberRaw) return null
  const m = memberRaw as any

  return {
    staff_id: m.staff_id,
    full_name: m.full_name ?? 'Unknown',
    email: m.email ?? null,
    role: m.role ?? null,
    roles: m.roles && m.roles.length > 0 ? m.roles : m.role ? [m.role] : [],
    avatar_url: m.avatar_url ?? null,
    hire_date: m.hire_date ?? null,
    working_days: m.working_days ?? [],
    assignments: (assignmentsRaw ?? []).map((a: any) => ({
      role: a.role ?? null,
      session: {
        booking_id: a.bookings?.booking_id ?? null,
        booking_ref: a.bookings?.booking_ref ?? null,
        session_date: (a.bookings?.sessions as any)?.[0]?.session_date ?? null,
        status: a.bookings?.status ?? null,
        client_name: a.bookings?.clients?.full_name ?? null,
      },
    })),
    recent_checkins: (checkinsRaw ?? []).map((c: any) => ({
      checkin_id: c.checkin_id,
      date: c.date,
      checked_in_at: c.checked_in_at,
      checked_out_at: c.checked_out_at ?? null,
    })),
  }
}
