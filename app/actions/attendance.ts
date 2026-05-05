'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsStaff } from '@/lib/studio'

/** Today's date as a YYYY-MM-DD string (local to server, UTC) */
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * checkedInAt — optional ISO timestamp supplied by the client.
 * If omitted the server falls back to now().
 * Passing it lets the admin record the real arrival time (e.g. "08:45").
 */
export async function checkIn(staffId: string, checkedInAt?: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsStaff(context.admin, context.studioId, staffId))) {
    return { error: 'Staff member not found' }
  }

  const today = todayISO()

  const { data: existing } = await context.admin
    .from('staff_checkins')
    .select('checkin_id, checked_out_at')
    .eq('staff_id', staffId)
    .eq('studio_id', context.studioId)
    .eq('date', today)
    .maybeSingle()

  if (existing) return { error: 'Already checked in today' }

  const ts = checkedInAt ?? new Date().toISOString()

  const { error } = await context.admin
    .from('staff_checkins')
    .insert({
      staff_id:      staffId,
      studio_id:     context.studioId,
      date:          today,
      checked_in_at: ts,
    })

  if (!error) {
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard')
  }
  return { error: error?.message ?? null }
}

export async function checkOut(staffId: string, checkedOutAt?: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsStaff(context.admin, context.studioId, staffId))) {
    return { error: 'Staff member not found' }
  }

  const today = todayISO()

  const { data: existing } = await context.admin
    .from('staff_checkins')
    .select('checkin_id, checked_out_at')
    .eq('staff_id', staffId)
    .eq('studio_id', context.studioId)
    .eq('date', today)
    .maybeSingle()

  if (!existing) return { error: 'Not checked in today' }
  if (existing.checked_out_at) return { error: 'Already checked out today' }

  const ts = checkedOutAt ?? new Date().toISOString()

  const { error } = await context.admin
    .from('staff_checkins')
    .update({ checked_out_at: ts })
    .eq('checkin_id', existing.checkin_id as string)

  if (!error) {
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard')
  }
  return { error: error?.message ?? null }
}

export async function getStaffCheckins(staffId: string, limit = 30) {
  const context = await getStudioContext()
  if ('error' in context) return { data: null, error: context.error }

  const { data, error } = await context.admin
    .from('staff_checkins')
    .select('checkin_id, date, checked_in_at, checked_out_at')
    .eq('staff_id', staffId)
    .eq('studio_id', context.studioId)
    .order('date', { ascending: false })
    .limit(limit)

  return { data, error: error?.message ?? null }
}

/** Fetch attendance records for the studio across a date range, optionally for one staff member. */
export async function getAttendanceRecords({
  from,
  to,
  staffId,
}: {
  from:     string          // YYYY-MM-DD
  to:       string          // YYYY-MM-DD
  staffId?: string | null
}) {
  const context = await getStudioContext()
  if ('error' in context) return { data: null, error: context.error }

  let q = context.admin
    .from('staff_checkins')
    .select('checkin_id, staff_id, date, checked_in_at, checked_out_at, staff(full_name, roles, role)')
    .eq('studio_id', context.studioId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
    .order('checked_in_at', { ascending: true })

  if (staffId) q = q.eq('staff_id', staffId)

  const { data, error } = await q
  return { data, error: error?.message ?? null }
}

/** Manually add or overwrite a check-in record for any staff member and date. */
export async function saveCheckin(form: {
  staffId:       string
  date:          string   // YYYY-MM-DD
  checkedInAt:   string   // HH:MM  local time string from client
  checkedOutAt?: string   // HH:MM  optional
}) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsStaff(context.admin, context.studioId, form.staffId))) {
    return { error: 'Staff member not found' }
  }

  function toISO(date: string, hhmm: string) {
    // Build a local-midnight Date then add the hours/minutes offset
    const [y, mo, d] = date.split('-').map(Number)
    const [h, m]     = hhmm.split(':').map(Number)
    return new Date(y, mo - 1, d, h, m, 0, 0).toISOString()
  }

  const checkedInAt  = toISO(form.date, form.checkedInAt)
  const checkedOutAt = form.checkedOutAt ? toISO(form.date, form.checkedOutAt) : null

  // Upsert based on (staff_id, date) unique constraint
  const { data: existing } = await context.admin
    .from('staff_checkins')
    .select('checkin_id')
    .eq('staff_id', form.staffId)
    .eq('studio_id', context.studioId)
    .eq('date', form.date)
    .maybeSingle()

  let error
  if (existing) {
    ;({ error } = await context.admin
      .from('staff_checkins')
      .update({ checked_in_at: checkedInAt, checked_out_at: checkedOutAt })
      .eq('checkin_id', existing.checkin_id as string))
  } else {
    ;({ error } = await context.admin
      .from('staff_checkins')
      .insert({
        staff_id:       form.staffId,
        studio_id:      context.studioId,
        date:           form.date,
        checked_in_at:  checkedInAt,
        checked_out_at: checkedOutAt,
      }))
  }

  if (!error) {
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/attendance/records')
    revalidatePath('/dashboard')
  }
  return { error: error?.message ?? null }
}

/** Delete a single check-in record. */
export async function deleteCheckin(checkinId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // Verify the record belongs to this studio
  const { data: row } = await context.admin
    .from('staff_checkins')
    .select('checkin_id')
    .eq('checkin_id', checkinId)
    .eq('studio_id', context.studioId)
    .maybeSingle()

  if (!row) return { error: 'Record not found' }

  const { error } = await context.admin
    .from('staff_checkins')
    .delete()
    .eq('checkin_id', checkinId)

  if (!error) {
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/attendance/records')
  }
  return { error: error?.message ?? null }
}
