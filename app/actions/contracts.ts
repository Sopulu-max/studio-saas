'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { sendContractEmail } from '@/lib/email'
import { getStudioContext, ownsBooking, ownsContract } from '@/lib/studio'
import { getContractDetail } from '@/lib/domains/contracts/repository'

const addContractSchema = z.object({
  booking_id: z.string().min(1, 'Booking is required'),
  content:    z.string().min(1, 'Contract content is required'),
})

export async function addContract(form: {
  booking_id: string
  content: string
  force_duplicate?: boolean
}) {
  const result = addContractSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsBooking(context.admin, context.studioId, form.booking_id))) {
    return { error: 'Session not found' }
  }

  if (!form.force_duplicate) {
    const { data: existing } = await context.admin
      .from('contracts')
      .select('contract_id')
      .eq('booking_id', form.booking_id)
      .maybeSingle()
    if (existing) return { error: '__DUPLICATE__', existingContractId: existing.contract_id as string }
  }

  const { data: contract, error } = await context.admin
    .from('contracts')
    .insert({
      booking_id: form.booking_id,
      content:    form.content,
      status:     'draft',
    })
    .select()
    .single()

  if (error || !contract) return { error: error?.message ?? 'Failed to create contract' }
  revalidatePath('/dashboard/contracts')
  return { error: null, contractId: contract.contract_id }
}

export async function updateContract(contractId: string, content: string) {
  if (!content.trim()) return { error: 'Contract content is required' }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsContract(context.admin, context.studioId, contractId))) {
    return { error: 'Contract not found' }
  }

  // Only allow editing drafts
  const { data: existing } = await context.admin
    .from('contracts')
    .select('status')
    .eq('contract_id', contractId)
    .single()

  if (existing?.status !== 'draft') {
    return { error: 'Only draft contracts can be edited' }
  }

  const { error } = await context.admin
    .from('contracts')
    .update({ content })
    .eq('contract_id', contractId)

  if (!error) {
    revalidatePath(`/dashboard/contracts/${contractId}`)
    revalidatePath('/dashboard/contracts')
  }
  return { error: error?.message ?? null }
}

export async function updateContractStatus(contractId: string, status: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsContract(context.admin, context.studioId, contractId))) {
    return { error: 'Contract not found' }
  }

  const { error } = await context.admin
    .from('contracts')
    .update({ status })
    .eq('contract_id', contractId)
  if (!error) {
    revalidatePath(`/dashboard/contracts/${contractId}`)
    revalidatePath('/dashboard/contracts')
  }
  return { error: error?.message ?? null }
}

export async function markContractSigned(contractId: string, signedBy: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsContract(context.admin, context.studioId, contractId))) {
    return { error: 'Contract not found' }
  }

  const { error } = await context.admin
    .from('contracts')
    .update({
      status:    'signed',
      signed_by: signedBy,
      signed_at: new Date().toISOString(),
    })
    .eq('contract_id', contractId)
  if (!error) {
    revalidatePath(`/dashboard/contracts/${contractId}`)
    revalidatePath('/dashboard/contracts')
  }
  return { error: error?.message ?? null }
}

export async function sendContractToClient(contractId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsContract(context.admin, context.studioId, contractId))) {
    return { error: 'Contract not found' }
  }

  const { data: studio } = await context.admin
    .from('studios')
    .select('name, email, slug')
    .eq('studio_id', context.studioId)
    .single()

  const contract = await getContractDetail(context.admin, context.studioId, contractId)

  if (!contract) return { error: 'Contract not found' }

  const clientEmail = contract.client_email
  if (!clientEmail) return { error: 'Client has no email address' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { error: emailError } = await sendContractEmail({
    to:          clientEmail,
    clientName:  contract.client_name ?? 'Client',
    studioName:  (studio?.name as string | null | undefined) ?? '',
    studioSlug:  (studio?.slug as string | null | undefined) ?? '',
    contractId,
    sessionDate: contract.session_date ?? undefined,
    siteUrl,
  })

  if (emailError) return { error: emailError }

  const { error } = await context.admin
    .from('contracts')
    .update({ status: 'sent' })
    .eq('contract_id', contractId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/contracts/${contractId}`)
  revalidatePath('/dashboard/contracts')
  return { error: null }
}

export async function deleteContract(contractId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsContract(context.admin, context.studioId, contractId))) {
    return { error: 'Contract not found' }
  }

  const { error } = await context.admin
    .from('contracts')
    .delete()
    .eq('contract_id', contractId)
  if (!error) revalidatePath('/dashboard/contracts')
  return { error: error?.message ?? null }
}
