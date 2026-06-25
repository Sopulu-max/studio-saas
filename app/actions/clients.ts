'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsClient } from '@/lib/studio'

import { createClient, editClient } from '@/lib/services/client-service'
import { searchClientsQuery } from '@/lib/domains/clients/repository'

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
  const data = await searchClientsQuery(context.admin, context.studioId, q)

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

  const response = await createClient(context.admin, {
    studio_id: context.studioId,
    full_name: form.full_name,
    email: form.email,
    phone: form.phone,
    address: form.address,
  })

  if (!response.error) revalidatePath('/dashboard/clients')
  return response
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
  if (!result.success) return { error: result.error.issues[0].message, existingClientId: null }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error, existingClientId: null }

  if (!(await ownsClient(context.admin, context.studioId, clientId))) {
    return { error: 'Client not found', existingClientId: null }
  }

  const response = await editClient(context.admin, clientId, {
    studio_id: context.studioId,
    full_name: form.full_name,
    email: form.email,
    phone: form.phone,
    address: form.address,
  })

  if (!response.error) {
    revalidatePath(`/dashboard/clients/${clientId}`)
    revalidatePath('/dashboard/clients')
  }
  return response
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
