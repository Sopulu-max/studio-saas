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
    .eq('checkin_id', existing.checkin_id)

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
