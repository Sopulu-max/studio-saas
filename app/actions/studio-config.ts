'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'
import type { SessionTypeConfig, BookingStatusConfig, EquipmentCategoryConfig, StaffRoleConfig } from '@/lib/studio-config'

export async function saveSessionTypes(sessionTypes: SessionTypeConfig[]) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!Array.isArray(sessionTypes) || sessionTypes.length === 0)
    return { error: 'At least one session type is required' }

  for (const t of sessionTypes) {
    if (!t.value?.trim()) return { error: 'Every session type needs a value' }
    if (!t.label?.trim()) return { error: 'Every session type needs a label' }
  }

  const { error } = await context.admin
    .from('studios')
    .update({ session_types: sessionTypes })
    .eq('studio_id', context.studioId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}



export async function saveBookingStatuses(bookingStatuses: BookingStatusConfig[]) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!Array.isArray(bookingStatuses) || bookingStatuses.length === 0)
    return { error: 'At least one booking status is required' }

  for (const s of bookingStatuses) {
    if (!s.value?.trim()) return { error: 'Every status needs a value' }
    if (!s.label?.trim()) return { error: 'Every status needs a label' }
  }

  const hasCancellation = bookingStatuses.some(s => s.is_cancellation)
  if (!hasCancellation) return { error: 'At least one status must be marked as the cancellation state' }

  const { error } = await context.admin
    .from('studios')
    .update({ booking_statuses: bookingStatuses })
    .eq('studio_id', context.studioId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}

export async function saveEquipmentCategories(categories: EquipmentCategoryConfig[]) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!Array.isArray(categories) || categories.length === 0)
    return { error: 'At least one category is required' }

  for (const c of categories) {
    if (!c.value?.trim()) return { error: 'Every category needs a value' }
    if (!c.label?.trim()) return { error: 'Every category needs a label' }
  }

  const { error } = await context.admin
    .from('studios')
    .update({ equipment_categories: categories })
    .eq('studio_id', context.studioId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/equipment')
  return { error: null }
}

export async function saveStaffRoles(roles: StaffRoleConfig[]) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!Array.isArray(roles) || roles.length === 0)
    return { error: 'At least one role is required' }

  for (const r of roles) {
    if (!r.value?.trim()) return { error: 'Every role needs a value' }
    if (!r.label?.trim()) return { error: 'Every role needs a label' }
  }

  const { error } = await context.admin
    .from('studios')
    .update({ staff_roles: roles })
    .eq('studio_id', context.studioId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/staff')
  return { error: null }
}
