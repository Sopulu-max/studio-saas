import { SupabaseClient } from '@supabase/supabase-js'
import { AttendanceStaffDTO, AttendanceStaffOptionDTO, AttendanceRecordDTO, CheckinHistoryDTO } from './types'

/**
 * Fetches all staff for the studio combined with today's check-in status.
 * Used by the attendance board (today's view).
 */
export async function getTodayAttendanceBoard(
  supabase: SupabaseClient,
  studioId: string
): Promise<{ staff: AttendanceStaffDTO[]; todayISO: string; todayDay: string; todayLabel: string }> {
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayDay = DAY_NAMES[today.getDay()]
  const todayLabel = today.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const [{ data: staffListRaw }, { data: checkinsRaw }] = await Promise.all([
    supabase
      .from('staff')
      .select('staff_id, full_name, roles, working_days')
      .eq('studio_id', studioId)
      .order('full_name'),
    supabase
      .from('staff_checkins')
      .select('checkin_id, staff_id, checked_in_at, checked_out_at')
      .eq('studio_id', studioId)
      .eq('date', todayISO),
  ])

  const checkinMap: Record<string, { checkin_id: string; checked_in_at: string; checked_out_at: string | null }> = {}
  for (const c of (checkinsRaw ?? []) as any[]) {
    checkinMap[c.staff_id] = {
      checkin_id: c.checkin_id,
      checked_in_at: c.checked_in_at,
      checked_out_at: c.checked_out_at ?? null,
    }
  }

  const staff: AttendanceStaffDTO[] = (staffListRaw ?? []).map((m: any) => ({
    staff_id: m.staff_id,
    full_name: m.full_name ?? 'Unknown',
    roles: m.roles ?? [],
    working_days: m.working_days ?? [],
    checkin: checkinMap[m.staff_id] ?? null,
  }))

  return { staff, todayISO, todayDay, todayLabel }
}

/**
 * Fetches a simple staff name list for the studio.
 * Used by the records page for filter dropdowns.
 */
export async function getAttendanceStaffOptions(
  supabase: SupabaseClient,
  studioId: string
): Promise<AttendanceStaffOptionDTO[]> {
  const { data: raw } = await supabase
    .from('staff')
    .select('staff_id, full_name')
    .eq('studio_id', studioId)
    .order('full_name')

  return (raw ?? []).map((m: any) => ({
    staff_id: m.staff_id,
    full_name: m.full_name ?? 'Unknown',
  }))
}

export async function getAttendanceRecords(
  supabase: SupabaseClient,
  studioId: string,
  from: string,
  to: string,
  staffId: string | null
): Promise<{ data: AttendanceRecordDTO[]; error: string | null }> {
  let q = supabase
    .from('staff_checkins')
    .select('checkin_id, staff_id, date, checked_in_at, checked_out_at, staff(full_name, roles)')
    .eq('studio_id', studioId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
    .order('checked_in_at', { ascending: true })

  if (staffId) q = q.eq('staff_id', staffId)

  const { data: raw, error } = await q

  if (error) return { data: [], error: error.message }

  const records: AttendanceRecordDTO[] = (raw ?? []).map((r: any) => ({
    checkin_id: r.checkin_id,
    staff_id: r.staff_id,
    date: r.date,
    checked_in_at: r.checked_in_at,
    checked_out_at: r.checked_out_at ?? null,
    staff: r.staff ? {
      full_name: Array.isArray(r.staff) ? (r.staff[0]?.full_name ?? '') : (r.staff.full_name ?? ''),
      roles: Array.isArray(r.staff) ? (r.staff[0]?.roles ?? []) : (r.staff.roles ?? []),
    } : null,
  }))

  return { data: records, error: null }
}

export async function getStaffCheckins(
  supabase: SupabaseClient,
  studioId: string,
  staffId: string,
  limit: number = 30
): Promise<{ data: CheckinHistoryDTO[]; error: string | null }> {
  const { data: raw, error } = await supabase
    .from('staff_checkins')
    .select('checkin_id, date, checked_in_at, checked_out_at')
    .eq('staff_id', staffId)
    .eq('studio_id', studioId)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) return { data: [], error: error.message }

  const checkins: CheckinHistoryDTO[] = (raw ?? []).map((c: any) => ({
    checkin_id: c.checkin_id,
    date: c.date,
    checked_in_at: c.checked_in_at,
    checked_out_at: c.checked_out_at ?? null,
  }))

  return { data: checkins, error: null }
}

export async function getCheckinByStaffAndDate(
  supabase: SupabaseClient,
  studioId: string,
  staffId: string,
  date: string
) {
  const { data, error } = await supabase
    .from('staff_checkins')
    .select('checkin_id, checked_out_at')
    .eq('staff_id', staffId)
    .eq('studio_id', studioId)
    .eq('date', date)
    .maybeSingle()
  return { data, error: error?.message ?? null }
}

export async function getCheckinById(
  supabase: SupabaseClient,
  studioId: string,
  checkinId: string
) {
  const { data, error } = await supabase
    .from('staff_checkins')
    .select('checkin_id')
    .eq('checkin_id', checkinId)
    .eq('studio_id', studioId)
    .maybeSingle()
  return { data, error: error?.message ?? null }
}

export async function insertCheckin(
  supabase: SupabaseClient,
  studioId: string,
  staffId: string,
  date: string,
  checkedInAt: string,
  checkedOutAt: string | null
) {
  const { error } = await supabase
    .from('staff_checkins')
    .insert({
      staff_id: staffId,
      studio_id: studioId,
      date: date,
      checked_in_at: checkedInAt,
      checked_out_at: checkedOutAt,
    })
  return { error: error?.message ?? null }
}

export async function updateCheckin(
  supabase: SupabaseClient,
  checkinId: string,
  checkedInAt: string | null,
  checkedOutAt: string | null
) {
  const updates: any = {}
  if (checkedInAt !== null) updates.checked_in_at = checkedInAt
  if (checkedOutAt !== null) updates.checked_out_at = checkedOutAt

  const { error } = await supabase
    .from('staff_checkins')
    .update(updates)
    .eq('checkin_id', checkinId)
  return { error: error?.message ?? null }
}

export async function deleteCheckinRecord(
  supabase: SupabaseClient,
  checkinId: string
) {
  const { error } = await supabase
    .from('staff_checkins')
    .delete()
    .eq('checkin_id', checkinId)
  return { error: error?.message ?? null }
}
