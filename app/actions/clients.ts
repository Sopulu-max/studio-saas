'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsClient } from '@/lib/studio'

const addClientSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
})

export async function searchClients(query: string) {
  if (!query || query.trim().length < 2) return { data: [] }

  const context = await getStudioContext()
  if ('error' in context) return { data: [] }

  const q = query.trim()
  const { data } = await context.admin
    .from('clients')
    .select('client_id, full_name, email, phone')
    .eq('studio_id', context.studioId)
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    .order('full_name')
    .limit(6)

  return { data: data ?? [] }
}

export async function addClient(form: {
  full_name: string
  email: string
  phone: string
  address: string
}) {
  const result = addClientSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message, existingClientId: null, existingClientName: null, newClientId: null }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error, existingClientId: null, existingClientName: null, newClientId: null }

  // Duplicate check — email (hard block), then phone (hard block)
  if (form.email) {
    const { data: byEmail } = await context.admin
      .from('clients')
      .select('client_id, full_name')
      .eq('studio_id', context.studioId)
      .eq('email', form.email.trim().toLowerCase())
      .maybeSingle()
    if (byEmail) {
      return {
        error: `A client named "${byEmail.full_name as string}" is already registered with this email.`,
        existingClientId: byEmail.client_id as string,
        existingClientName: byEmail.full_name as string,
        newClientId: null,
      }
    }
  }

  if (form.phone) {
    const { data: byPhone } = await context.admin
      .from('clients')
      .select('client_id, full_name')
      .eq('studio_id', context.studioId)
      .eq('phone', form.phone.trim())
      .maybeSingle()
    if (byPhone) {
      return {
        error: `A client named "${byPhone.full_name as string}" is already registered with this phone number.`,
        existingClientId: byPhone.client_id as string,
        existingClientName: byPhone.full_name as string,
        newClientId: null,
      }
    }
  }

  const { data: inserted, error } = await context.admin.from('clients').insert({
    full_name: form.full_name,
    email:     form.email || null,
    phone:     form.phone || null,
    address:   form.address || null,
    studio_id: context.studioId,
  }).select('client_id').single()

  if (!error) revalidatePath('/dashboard/clients')
  return { error: error?.message ?? null, existingClientId: null, existingClientName: null, newClientId: (inserted?.client_id as string | undefined) ?? null }
}

export async function deleteClient(clientId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsClient(context.admin, context.studioId, clientId))) {
    return { error: 'Client not found' }
  }

  const { error } = await context.admin
    .from('clients')
    .delete()
    .eq('client_id', clientId)

  if (!error) revalidatePath('/dashboard/clients')
  return { error: error?.message ?? null }
}

export async function updateClient(clientId: string, form: {
  full_name: string
  email: string
  phone: string
  address: string
}) {
  const result = addClientSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsClient(context.admin, context.studioId, clientId))) {
    return { error: 'Client not found' }
  }

  if (form.email) {
    const { data: byEmail } = await context.admin
      .from('clients')
      .select('client_id, full_name')
      .eq('studio_id', context.studioId)
      .eq('email', form.email.trim().toLowerCase())
      .neq('client_id', clientId)
      .maybeSingle()
    if (byEmail) return { error: `"${byEmail.full_name as string}" is already registered with this email.`, existingClientId: byEmail.client_id as string }
  }

  if (form.phone) {
    const { data: byPhone } = await context.admin
      .from('clients')
      .select('client_id, full_name')
      .eq('studio_id', context.studioId)
      .eq('phone', form.phone.trim())
      .neq('client_id', clientId)
      .maybeSingle()
    if (byPhone) return { error: `"${byPhone.full_name as string}" is already registered with this phone number.`, existingClientId: byPhone.client_id as string }
  }

  const { error } = await context.admin
    .from('clients')
    .update({ full_name: form.full_name, email: form.email || null, phone: form.phone || null, address: form.address || null })
    .eq('client_id', clientId)

  if (!error) {
    revalidatePath(`/dashboard/clients/${clientId}`)
    revalidatePath('/dashboard/clients')
  }
  return { error: error?.message ?? null }
}

export async function updateClientAvatar(clientId: string, avatarUrl: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsClient(context.admin, context.studioId, clientId))) {
    return { error: 'Client not found' }
  }

  const { error } = await context.admin
    .from('clients')
    .update({ avatar_url: avatarUrl })
    .eq('client_id', clientId)
  revalidatePath(`/dashboard/clients/${clientId}`)
  revalidatePath('/dashboard/clients')
  return { error: error?.message ?? null }
}
