'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsStaff } from '@/lib/studio'
import {
  getAttendanceRecords as repoGetAttendanceRecords,
  getStaffCheckins as repoGetStaffCheckins,
  getCheckinByStaffAndDate,
  getCheckinById,
  insertCheckin,
  updateCheckin,
  deleteCheckinRecord,
} from '@/lib/domains/attendance/repository'

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

  const { data: existing } = await getCheckinByStaffAndDate(context.admin, context.studioId, staffId, today)
  if (existing) return { error: 'Already checked in today' }

  const ts = checkedInAt ?? new Date().toISOString()

  const { error } = await insertCheckin(context.admin, context.studioId, staffId, today, ts, null)

  if (!error) {
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard')
  }
  return { error }
}

export async function checkOut(staffId: string, checkedOutAt?: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsStaff(context.admin, context.studioId, staffId))) {
    return { error: 'Staff member not found' }
  }

  const today = todayISO()

  const { data: existing } = await getCheckinByStaffAndDate(context.admin, context.studioId, staffId, today)
  if (!existing) return { error: 'Not checked in today' }
  if (existing.checked_out_at) return { error: 'Already checked out today' }

  const ts = checkedOutAt ?? new Date().toISOString()

  const { error } = await updateCheckin(context.admin, existing.checkin_id, null, ts)

  if (!error) {
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard')
  }
  return { error }
}

export async function getStaffCheckins(staffId: string, limit = 30) {
  const context = await getStudioContext()
  if ('error' in context) return { data: null, error: context.error }

  const { data, error } = await repoGetStaffCheckins(context.admin, context.studioId, staffId, limit)
  return { data, error }
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

  const { data, error } = await repoGetAttendanceRecords(context.admin, context.studioId, from, to, staffId ?? null)
  return { data, error }
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
    const [y, mo, d] = date.split('-').map(Number)
    const [h, m]     = hhmm.split(':').map(Number)
    return new Date(y, mo - 1, d, h, m, 0, 0).toISOString()
  }

  const checkedInAt  = toISO(form.date, form.checkedInAt)
  const checkedOutAt = form.checkedOutAt ? toISO(form.date, form.checkedOutAt) : null

  const { data: existing } = await getCheckinByStaffAndDate(context.admin, context.studioId, form.staffId, form.date)

  let error
  if (existing) {
    ;({ error } = await updateCheckin(context.admin, existing.checkin_id, checkedInAt, checkedOutAt))
  } else {
    ;({ error } = await insertCheckin(context.admin, context.studioId, form.staffId, form.date, checkedInAt, checkedOutAt))
  }

  if (!error) {
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/attendance/records')
    revalidatePath('/dashboard')
  }
  return { error }
}

/** Delete a single check-in record. */
export async function deleteCheckin(checkinId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { data: row } = await getCheckinById(context.admin, context.studioId, checkinId)
  if (!row) return { error: 'Record not found' }

  const { error } = await deleteCheckinRecord(context.admin, checkinId)

  if (!error) {
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/attendance/records')
  }
  return { error }
}
