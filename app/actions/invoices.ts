'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { sendInvoiceEmail } from '@/lib/email'
import { getStudioContext, fetchStudio, ownsBooking, ownsInvoice, ownsPackage } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'
import { unwrapRow } from "@/lib/utils";

const addInvoiceSchema = z.object({
  booking_id:    z.string().min(1, 'Session is required'),
  agreed_amount: z.string().refine(v => parseFloat(v) > 0, 'Agreed amount must be greater than 0'),
  discount:      z.string().optional().default('0'),
  tax:           z.string().optional().default('0'),
  due_date:      z.string().optional().default(''),
  addon_ids:     z.array(z.string()),
  package_id:    z.string().optional(),
})

const addPaymentSchema = z.object({
  invoice_id: z.string().min(1),
  amount: z.string().refine(v => parseFloat(v) > 0, 'Amount must be greater than 0'),
  method: z.enum(['card', 'bank_transfer', 'cash', 'mobile_money'], {
    error: 'Invalid payment method',
  }),
  reference: z.string().optional().default(''),
})

export async function recordIntake(form: {
  sessionId: string
  agreedAmount: string
  paymentAmount: string
  paymentMethod: string
}) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsBooking(context.admin, context.studioId, form.sessionId))) {
    return { error: 'Session not found' }
  }

  const agreed = Math.max(0, parseFloat(form.agreedAmount) || 0)
  if (agreed === 0) return { error: 'Agreed amount must be greater than 0' }

  const paid = Math.max(0, parseFloat(form.paymentAmount) || 0)
  const invoiceStatus = paid === 0 ? 'draft' : paid >= agreed ? 'paid' : 'sent'

  const { data: invoice, error: invoiceError } = await context.admin
    .from('invoices')
    .insert({
      booking_id: form.sessionId,
      subtotal: agreed,
      discount: 0,
      tax: 0,
      total: agreed,
      status: invoiceStatus,
      issued_at: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (invoiceError || !invoice) return { error: invoiceError?.message ?? 'Failed to create invoice' }

  if (paid > 0) {
    const { error: paymentError } = await context.admin
      .from('payments')
      .insert({
        invoice_id: invoice.invoice_id,
        amount: paid,
        method: form.paymentMethod,
        paid_at: new Date().toISOString(),
      })
    if (paymentError) return { error: paymentError.message }
  }

  return { error: null, invoiceId: invoice.invoice_id }
}

export async function addInvoice(form: {
  booking_id: string
  agreed_amount: string
  discount: string
  tax: string
  due_date: string
  addon_ids: string[]
  package_id?: string
  force_duplicate?: boolean
}) {
  const result = addInvoiceSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsBooking(context.admin, context.studioId, form.booking_id))) {
    return { error: 'Session not found' }
  }

  if (form.package_id && !(await ownsPackage(context.admin, context.studioId, form.package_id))) {
    return { error: 'Package not found' }
  }

  if (!form.force_duplicate) {
    const { data: existing } = await context.admin
      .from('invoices')
      .select('invoice_id')
      .eq('booking_id', form.booking_id)
      .neq('status', 'cancelled')
      .maybeSingle()
    if (existing) return { error: '__DUPLICATE__', existingInvoiceId: existing.invoice_id as string }
  }

  // NOTE: package_id is intentionally NOT written back to bookings here.
  // Package assignment is the exclusive responsibility of the booking creation/edit flow.
  // Reading form.package_id here is only used for addon price lookups below.

  // Subtotal = agreed amount + any selected add-ons
  let subtotal = Math.max(0, parseFloat(form.agreed_amount) || 0)

  if (form.addon_ids.length > 0) {
    const { data: addons } = await context.admin
      .from('package_addons')
      .select('addon_id, price, packages!inner(studio_id)')
      .in('addon_id', form.addon_ids)
      .eq('packages.studio_id', context.studioId)

    if ((addons?.length ?? 0) !== form.addon_ids.length) {
      return { error: 'One or more add-ons could not be found' }
    }

    addons?.forEach(a => { subtotal += Number(a.price) })
  }

  const discount = Math.max(0, parseFloat(form.discount) || 0)
  const tax      = Math.max(0, parseFloat(form.tax)      || 0)
  const total    = Math.max(0, (subtotal - discount) * (1 + tax / 100))

  const { data: invoice, error } = await context.admin
    .from('invoices')
    .insert({
      booking_id: form.booking_id,
      subtotal,
      discount,
      tax,
      total,
      status: 'draft',
      issued_at: new Date().toISOString().split('T')[0],
      due_date: form.due_date || null,
    })
    .select()
    .single()

  if (error || !invoice) return { error: error?.message ?? 'Failed to create invoice' }

  if (form.addon_ids.length > 0) {
    await context.admin.from('booking_addons').insert(
      form.addon_ids.map(addon_id => ({
        booking_id: form.booking_id,
        addon_id,
        quantity: 1,
      }))
    )
  }

  return { error: null, invoiceId: invoice.invoice_id as string }
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsInvoice(context.admin, context.studioId, invoiceId))) {
    return { error: 'Invoice not found' }
  }

  const { error } = await context.admin
    .from('invoices')
    .update({ status })
    .eq('invoice_id', invoiceId)
  return { error: error?.message ?? null }
}

export async function addPayment(form: {
  invoice_id: string
  amount: string
  method: string
  reference: string
}) {
  const result = addPaymentSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsInvoice(context.admin, context.studioId, form.invoice_id))) {
    return { error: 'Invoice not found' }
  }

  const { error } = await context.admin.from('payments').insert({
    invoice_id: form.invoice_id,
    amount: parseFloat(form.amount),
    method: form.method,
    reference: form.reference || null,
    paid_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }

  // Auto-flip to 'paid' when cumulative payments reach the invoice total
  const { data: inv } = await context.admin
    .from('invoices')
    .select('total, status, payments(amount)')
    .eq('invoice_id', form.invoice_id)
    .single()

  if (inv && inv.status !== 'paid' && inv.status !== 'cancelled') {
    const totalPaid = ((inv.payments as unknown as { amount: number }[]) ?? [])
      .reduce((s, p) => s + Number(p.amount), 0)
    if (totalPaid >= Number(inv.total)) {
      await context.admin
        .from('invoices')
        .update({ status: 'paid' })
        .eq('invoice_id', form.invoice_id)
    }
  }

  revalidatePath(`/dashboard/invoices/${form.invoice_id}`)
  revalidatePath('/dashboard/invoices')
  return { error: null }
}

export async function sendInvoiceToClient(invoiceId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsInvoice(context.admin, context.studioId, invoiceId))) {
    return { error: 'Invoice not found' }
  }

  const { data: studio } = await context.admin
    .from('studios')
    .select('name, email, slug')
    .eq('owner_id', context.userId)
    .single()

  type InvoiceEmailRecord = {
    total?: number | string | null
    due_date?: string | null
    bookings?: {
      sessions?: { session_date?: string | null }[] | null
      clients?: { full_name?: string | null; email?: string | null } | null
    } | null
  }
  const { data: invoiceRaw } = await context.admin
    .from('invoices')
    .select('total, due_date, bookings(sessions(session_date), clients(full_name, email))')
    .eq('invoice_id', invoiceId)
    .single()
  const invoice = invoiceRaw as unknown as InvoiceEmailRecord | null

  if (!invoice) return { error: 'Invoice not found' }

  const clientEmail = unwrapRow(unwrapRow(invoice.bookings)?.clients)?.email
  if (!clientEmail) return { error: 'Client has no email address' }

  const { error: emailError } = await sendInvoiceEmail({
    to: clientEmail,
    clientName: unwrapRow(unwrapRow(invoice.bookings)?.clients)?.full_name ?? 'Client',
    studioName: (studio?.name as string | null | undefined) ?? '',
    studioSlug: (studio?.slug as string | null | undefined) ?? '',
    invoiceId,
    total: Number(invoice.total),
    dueDate: invoice.due_date ?? undefined,
    sessionDate: (Array.isArray(unwrapRow(invoice.bookings)?.sessions) ? (unwrapRow(invoice.bookings)?.sessions as any)[0]?.session_date : (unwrapRow(invoice.bookings)?.sessions as any)?.session_date) ?? undefined,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  })

  if (emailError) return { error: emailError }

  const { error } = await context.admin
    .from('invoices')
    .update({ status: 'sent' })
    .eq('invoice_id', invoiceId)

  if (error) return { error: error.message }

  return { error: null }
}

export async function addExtraCharge(invoiceId: string, extraAmount: number) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsInvoice(context.admin, context.studioId, invoiceId))) {
    return { error: 'Invoice not found' }
  }

  const { data: invoice, error: fetchError } = await context.admin
    .from('invoices')
    .select('subtotal, discount, tax')
    .eq('invoice_id', invoiceId)
    .single()

  if (fetchError || !invoice) return { error: fetchError?.message ?? 'Invoice not found' }

  const newSubtotal = Number(invoice.subtotal) + extraAmount
  const discount = Number(invoice.discount)
  const tax = Number(invoice.tax)
  const newTotal = Math.max(0, (newSubtotal - discount) * (1 + tax / 100))

  const { error } = await context.admin
    .from('invoices')
    .update({ subtotal: newSubtotal, total: newTotal, status: 'sent' })
    .eq('invoice_id', invoiceId)

  return { error: error?.message ?? null }
}

type InvoiceBooking = {
  booking_id: string
  booking_ref: number | null
  session_date: string | null
  status: string | null
  session_type: string | null
  package_id: string | null
  custom_answers: Record<string, any> | null
  clients: { full_name: string | null; phone: string | null } | null
  packages: { name: string | null; base_price: number | null } | null
}

export async function getInvoiceFormData(bookingId?: string) {
  const context = await getStudioContext()
  if ('error' in context) return { bookings: [] as InvoiceBooking[], packages: [] }

  if (bookingId && !(await ownsBooking(context.admin, context.studioId, bookingId))) {
    return { bookings: [] as InvoiceBooking[], packages: [] }
  }

  // Build config so the cancellation filter is dynamic, not hardcoded
  const studioRow    = await fetchStudio(context.admin, context.studioId)
  const config       = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)
  const cancelValues = config.bookingStatuses.filter(s => s.is_cancellation).map(s => s.value)

  let bookingsQuery = context.admin
    .from('bookings')
    .select('booking_id, booking_ref, status, package_id, custom_answers, clients(full_name, phone), packages(name, base_price), sessions(session_date, session_type)')
    .eq('studio_id', context.studioId)
    .order('created_at', { ascending: false })
  for (const v of cancelValues) { bookingsQuery = bookingsQuery.neq('status', v) }
  const { data: studioBookingsRaw } = await bookingsQuery

  const studioBookings = (studioBookingsRaw ?? []).map((b: any) => {
    const s = Array.isArray(b.sessions) ? b.sessions[0] : b.sessions
    return {
      ...b,
      session_date: s?.session_date ?? null,
      session_type: s?.session_type ?? null,
    }
  })

  const { data: studioPackages } = await context.admin
    .from('packages')
    .select('package_id, name, base_price, package_addons(addon_id, name, price)')
    .eq('studio_id', context.studioId)
    .order('base_price', { ascending: true })

  type PackageWithAddons = {
    package_id: string
    name: string
    base_price: number | string
    package_addons?: { addon_id: string; name: string; price: number | string }[] | null
  }
  return {
    bookings: (studioBookings ?? []) as unknown as InvoiceBooking[],
    packages: (studioPackages ?? []) as unknown as PackageWithAddons[],
  }
}
