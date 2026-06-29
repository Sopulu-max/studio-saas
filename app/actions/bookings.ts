'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getStudioContext } from '@/lib/studio'
import { createClient } from '@/lib/supabase/server'
import { createBooking, updateBookingCommerce, updateBookingStatus, deleteBooking } from '@/lib/domains/bookings/commands'

const createSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  package_id: z.string().optional(),
  notes: z.string().optional(),
})

export async function addBooking(form: z.infer<typeof createSchema>) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const result = await createBooking(supabase, {
      studio_id: context.studioId,
      client_id: form.client_id,
      package_id: form.package_id,
      notes: form.notes,
      status: 'draft',
    })

    if (!result) return { error: 'Failed to create booking' }

    // If package_id exists, we should map package_services to booking_services.
    if (form.package_id) {
      const { data: pkgServices } = await supabase
        .from('package_services')
        .select('service_id, is_addon, addon_price, services(price)')
        .eq('package_id', form.package_id)

      if (pkgServices && pkgServices.length > 0) {
        const bookingServices = pkgServices.map(ps => {
          const servicePrice = (ps.services as any)?.price
          return {
            booking_id: result.booking_id,
            service_id: ps.service_id,
            is_addon: ps.is_addon,
            price_at_booking: ps.is_addon ? ps.addon_price : servicePrice,
            quantity: 1,
            status: 'pending'
          }
        })

        await supabase.from('booking_services').insert(bookingServices)
      }
    }

    revalidatePath('/dashboard/bookings')
    return { success: true, booking_id: result.booking_id }
  } catch (error: any) {
    console.error('Error in addBooking action:', error)
    return { error: error.message || 'Server error' }
  }
}

const updateSchema = z.object({
  booking_id: z.string().min(1),
  client_id: z.string().optional(),
  package_id: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  drive_link: z.string().optional(),
})

export async function editBookingCommerce(form: z.infer<typeof updateSchema>) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const success = await updateBookingCommerce(supabase, context.studioId, form.booking_id, {
      client_id: form.client_id,
      package_id: form.package_id,
      status: form.status,
      notes: form.notes,
      drive_link: form.drive_link,
    })

    if (!success) return { error: 'Failed to update booking' }

    revalidatePath(`/dashboard/bookings/${form.booking_id}`)
    revalidatePath('/dashboard/bookings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Server error' }
  }
}

export async function changeBookingStatus(bookingId: string, status: string) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const success = await updateBookingStatus(supabase, context.studioId, bookingId, status)
    if (!success) return { error: 'Failed to update status' }

    revalidatePath(`/dashboard/bookings/${bookingId}`)
    revalidatePath('/dashboard/bookings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Server error' }
  }
}

export async function updateSessionDriveLink(bookingId: string, driveLink: string) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const success = await updateBookingCommerce(supabase, context.studioId, bookingId, { drive_link: driveLink })
    if (!success) return { error: 'Failed to update drive link' }

    revalidatePath(`/dashboard/bookings/${bookingId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Server error' }
  }
}

export async function recordSelections(bookingId: string, count: number) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const success = await updateBookingCommerce(supabase, context.studioId, bookingId, { selections_count: count })
    if (!success) return { error: 'Failed to update selections count' }

    revalidatePath(`/dashboard/bookings/${bookingId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Server error' }
  }
}

export async function updateBookingExtras(bookingId: string, extras: { extra_outfits: string; extra_pictures: string }) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const success = await updateBookingCommerce(supabase, context.studioId, bookingId, {
      extra_outfits: extras.extra_outfits ? parseInt(extras.extra_outfits, 10) : null,
      extra_pictures: extras.extra_pictures ? parseInt(extras.extra_pictures, 10) : null,
    })

    if (!success) return { error: 'Failed to update extras' }

    revalidatePath(`/dashboard/bookings/${bookingId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Server error' }
  }
}

export async function removeBooking(bookingId: string) {
  try {
    const context = await getStudioContext()
    if ('error' in context) return { error: context.error }
    const supabase = await createClient()

    const success = await deleteBooking(supabase, context.studioId, bookingId)
    if (!success) return { error: 'Failed to delete booking' }

    revalidatePath('/dashboard/bookings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Server error' }
  }
}
