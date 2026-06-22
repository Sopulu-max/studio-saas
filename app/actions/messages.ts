'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

type PaymentProofMessage = {
  id: string
  requires_verification: boolean | null
}

type InvoiceForPaymentProof = {
  invoice_id: string
  status: string | null
  total: number | string | null
  payments?: { amount: number | string | null }[] | null
}

/**
 * Allows a studio manager to manually send a WhatsApp message to a client
 * from the Dashboard Inbox.
 */
export async function sendStudioMessage(conversationId: string, content: string) {
  if (!content.trim()) return { error: 'Message cannot be empty' }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { data: conversation } = await context.admin
    .from('conversations')
    .select('client_phone')
    .eq('id', conversationId)
    .eq('studio_id', context.studioId)
    .maybeSingle()

  if (!conversation) return { error: 'Conversation not found' }

  const result = await sendWhatsAppMessage(context.studioId, conversation.client_phone as string, content)
  if (result.error) return { error: result.error }

  revalidatePath('/dashboard/messages')
  return { error: null }
}

/**
 * Verifies a WhatsApp receipt image, records a payment, and closes the proof.
 */
export async function verifyPaymentProof(messageId: string, invoiceId: string, amountPaid: number) {
  const amount = Number(amountPaid)
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount must be greater than 0' }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { data: messageRaw } = await context.admin
    .from('messages')
    .select('id, requires_verification, conversations!inner(studio_id)')
    .eq('id', messageId)
    .eq('conversations.studio_id', context.studioId)
    .maybeSingle()

  const message = messageRaw as unknown as PaymentProofMessage | null
  if (!message) return { error: 'Message not found' }
  if (!message.requires_verification) return { error: 'This message does not require verification' }

  const { data: invoiceRaw } = await context.admin
    .from('invoices')
    .select('invoice_id, status, total, payments(amount), bookings!inner(studio_id)')
    .eq('invoice_id', invoiceId)
    .eq('bookings.studio_id', context.studioId)
    .maybeSingle()

  const invoice = invoiceRaw as unknown as InvoiceForPaymentProof | null
  if (!invoice) return { error: 'Invoice not found' }
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return { error: 'Invoice is not open for payment' }
  }

  const { error: paymentError } = await context.admin
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      amount,
      method: 'bank_transfer',
      reference: `WhatsApp receipt ${messageId}`,
      paid_at: new Date().toISOString(),
    })

  if (paymentError) return { error: paymentError.message }

  const totalPaid = ((invoice.payments ?? []) as { amount: number | string | null }[])
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), amount)

  if (totalPaid >= Number(invoice.total ?? 0)) {
    await context.admin
      .from('invoices')
      .update({ status: 'paid' })
      .eq('invoice_id', invoiceId)
  }

  await context.admin
    .from('messages')
    .update({ requires_verification: false })
    .eq('id', messageId)

  revalidatePath('/dashboard/messages')
  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/invoices/${invoiceId}`)
  return { error: null }
}
