'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getStudioContext } from '@/lib/studio'
import { createClient } from '@/lib/supabase/server'
import { createSession, updateSessionLogistics, deleteSession } from '@/lib/domains/sessions/commands'

const createSchema = z.object({
  booking_id: z.string().min(1, 'Booking ID is required'),
  session_date: z.string().optional(),
  session_type: z.string().optional(),
  location_address: z.string().optional(),
  event_name: z.string().optional(),
  event_date: z.string().optional(),
  shoot_type: z.string().optional(),
  notes: z.string().optional(),
})

export async function scheduleSession(form: z.infer<typeof createSchema>) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const result = await createSession(supabase, {
      studio_id: context.studioId,
      booking_id: form.booking_id,
      session_date: form.session_date,
      session_type: form.session_type,
      location_address: form.location_address,
      event_name: form.event_name,
      event_date: form.event_date,
      shoot_type: form.shoot_type,
      notes: form.notes,
    })

    if (!result) return { error: 'Failed to schedule session' }

    revalidatePath(`/dashboard/bookings/${form.booking_id}`)
    revalidatePath('/dashboard/calendar')
    return { success: true, session_id: result.session_id }
  } catch (error: any) {
    console.error('Error in scheduleSession action:', error)
    return { error: error.message || 'Server error' }
  }
}

const updateSchema = z.object({
  session_id: z.string().min(1),
  booking_id: z.string().min(1),
  session_date: z.string().optional(),
  session_type: z.string().optional(),
  location_address: z.string().optional(),
  event_name: z.string().optional(),
  event_date: z.string().optional(),
  shoot_type: z.string().optional(),
  notes: z.string().optional(),
})

export async function editSessionLogistics(form: z.infer<typeof updateSchema>) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const success = await updateSessionLogistics(supabase, context.studioId, form.session_id, {
      session_date: form.session_date,
      session_type: form.session_type,
      location_address: form.location_address,
      event_name: form.event_name,
      event_date: form.event_date,
      shoot_type: form.shoot_type,
      notes: form.notes,
    })

    if (!success) return { error: 'Failed to update session logistics' }

    revalidatePath(`/dashboard/bookings/${form.booking_id}`)
    revalidatePath('/dashboard/calendar')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Server error' }
  }
}

export async function removeSession(sessionId: string, bookingId: string) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const success = await deleteSession(supabase, context.studioId, sessionId)
    if (!success) return { error: 'Failed to delete session' }

    revalidatePath(`/dashboard/bookings/${bookingId}`)
    revalidatePath('/dashboard/calendar')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Server error' }
  }
}

export async function assignSessionStaff(sessionId: string, bookingId: string, staffId: string, role: string) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const { error } = await supabase.from('booking_staff').insert({
      session_id: sessionId,
      booking_id: bookingId,
      staff_id: staffId,
      role: role
    })

    if (error) return { error: 'Failed to assign staff' }

    revalidatePath(`/dashboard/bookings/${bookingId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Server error' }
  }
}

export async function removeSessionStaff(sessionId: string, bookingId: string, staffId: string) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const { error } = await supabase.from('booking_staff')
      .delete()
      .eq('session_id', sessionId)
      .eq('booking_id', bookingId)
      .eq('staff_id', staffId)

    if (error) return { error: 'Failed to remove staff' }

    revalidatePath(`/dashboard/bookings/${bookingId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Server error' }
  }
}
