'use server'

import { getStudioContext } from '@/lib/studio'
import { revalidatePath } from 'next/cache'

export async function updateBookingServiceStatus(bookingServiceId: string, status: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  // Verify ownership: ensure the booking_service belongs to a booking owned by this studio
  const { data: bs, error: fetchError } = await context.admin
    .from('booking_services')
    .select('booking_id, bookings(studio_id)')
    .eq('booking_service_id', bookingServiceId)
    .single()

  if (fetchError || !bs) return { error: 'Service not found' }
  const booking = bs.bookings as unknown as { studio_id: string }
  if (booking.studio_id !== context.studioId) return { error: 'Unauthorized' }

  // Update status
  const { error: updateError } = await context.admin
    .from('booking_services')
    .update({ status })
    .eq('booking_service_id', bookingServiceId)

  if (updateError) {
    console.error('Failed to update booking service status', updateError)
    return { error: 'Database error' }
  }

  revalidatePath(`/dashboard/bookings/${bs.booking_id}`)
  return { success: true }
}

