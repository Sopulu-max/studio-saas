'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsBooking, ownsPrintOrder, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'

const itemSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  size:         z.string().optional().default(''),
  quantity:     z.number().int().min(1, 'Quantity must be at least 1'),
  unit_price:   z.number().min(0, 'Price cannot be negative'),
})

const addOrderSchema = z.object({
  booking_id: z.string().optional(),
  notes:      z.string().optional().default(''),
  items:      z.array(itemSchema).min(1, 'Add at least one item'),
})

export async function addPrintOrder(form: {
  booking_id: string
  notes: string
  items: { product_name: string; size: string; quantity: number; unit_price: number }[]
}) {
  const result = addOrderSchema.safeParse({
    ...form,
    booking_id: form.booking_id || undefined,
  })
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (form.booking_id && !(await ownsBooking(context.admin, context.studioId, form.booking_id))) {
    return { error: 'Session not found' }
  }

  const { data: order, error: orderError } = await context.admin
    .from('print_orders')
    .insert({
      studio_id:  context.studioId,
      booking_id: form.booking_id || null,
      notes:      form.notes || null,
      status:     'pending',
    })
    .select()
    .single()

  if (orderError || !order) return { error: orderError?.message ?? 'Failed to create order' }

  const { error: itemsError } = await context.admin
    .from('print_order_items')
    .insert(
      form.items.map(item => ({
        order_id:     order.order_id,
        product_name: item.product_name,
        size:         item.size || null,
        quantity:     item.quantity,
        unit_price:   item.unit_price,
      }))
    )

  if (itemsError) return { error: itemsError.message }
  return { error: null, orderId: order.order_id }
}

export async function updatePrintOrder(orderId: string, form: {
  notes: string
  items: { product_name: string; size: string; quantity: number; unit_price: number }[]
}) {
  const result = addOrderSchema.safeParse({ notes: form.notes, items: form.items })
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsPrintOrder(context.admin, context.studioId, orderId))) {
    return { error: 'Print order not found' }
  }

  // Update notes
  const { error: updateError } = await context.admin
    .from('print_orders')
    .update({ notes: form.notes || null })
    .eq('order_id', orderId)

  if (updateError) return { error: updateError.message }

  // Replace all items: delete then re-insert
  const { error: deleteError } = await context.admin
    .from('print_order_items')
    .delete()
    .eq('order_id', orderId)

  if (deleteError) return { error: deleteError.message }

  const { error: itemsError } = await context.admin
    .from('print_order_items')
    .insert(
      form.items.map(item => ({
        order_id:     orderId,
        product_name: item.product_name,
        size:         item.size || null,
        quantity:     item.quantity,
        unit_price:   item.unit_price,
      }))
    )

  if (itemsError) return { error: itemsError.message }

  revalidatePath(`/dashboard/print-orders/${orderId}`)
  revalidatePath('/dashboard/print-orders')
  return { error: null }
}

export async function updatePrintOrderStatus(orderId: string, status: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsPrintOrder(context.admin, context.studioId, orderId))) {
    return { error: 'Print order not found' }
  }

  const { error } = await context.admin
    .from('print_orders')
    .update({ status })
    .eq('order_id', orderId)
  return { error: error?.message ?? null }
}

type PrintOrderFormSession = {
  booking_id: string
  booking_ref?: number | null
  session_date?: string | null
  session_type?: string | null
  clients?: { full_name?: string | null; phone?: string | null } | null
  packages?: { name?: string | null } | null
}

export async function getPrintOrderFormData() {
  const context = await getStudioContext()
  if ('error' in context) return { sessions: [] as PrintOrderFormSession[] }

  // Use dynamic config so custom cancellation status values are respected
  const studioRow    = await fetchStudio(context.admin, context.studioId)
  const config       = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)
  const cancelValues = config.bookingStatuses.filter(s => s.is_cancellation).map(s => s.value)

  let query = context.admin
    .from('bookings')
    .select('booking_id, booking_ref, clients(full_name, phone), packages(name), sessions(session_date, session_type)')
    .eq('studio_id', context.studioId)
    .order('created_at', { ascending: false })
  for (const v of cancelValues) { query = query.neq('status', v) }

  const { data: sessionsRaw } = await query
  
  const mappedSessions = (sessionsRaw ?? []).map((b: any) => {
    const s = Array.isArray(b.sessions) ? b.sessions[0] : b.sessions
    return {
      ...b,
      session_date: s?.session_date ?? null,
      session_type: s?.session_type ?? null,
    }
  })
  
  return { sessions: mappedSessions as unknown as PrintOrderFormSession[] }
}
