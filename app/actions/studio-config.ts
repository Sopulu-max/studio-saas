'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'
import type { SessionTypeConfig, ServiceTypeConfig, BookingStatusConfig } from '@/lib/studio-config'

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

export async function saveServiceTypes(serviceTypes: ServiceTypeConfig[]) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!Array.isArray(serviceTypes) || serviceTypes.length === 0)
    return { error: 'At least one service type is required' }

  for (const t of serviceTypes) {
    if (!t.value?.trim()) return { error: 'Every service type needs a value' }
    if (!t.label?.trim()) return { error: 'Every service type needs a label' }
  }

  const { error } = await context.admin
    .from('studios')
    .update({ service_types: serviceTypes })
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
