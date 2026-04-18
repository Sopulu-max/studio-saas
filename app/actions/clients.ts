'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsClient } from '@/lib/studio'

const addClientSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
})

export async function addClient(form: {
  full_name: string
  email: string
  phone: string
  address: string
}) {
  const result = addClientSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { error } = await context.admin.from('clients').insert({
    ...form,
    studio_id: context.studioId,
  })

  if (!error) revalidatePath('/dashboard/clients')
  return { error: error?.message ?? null }
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

  const { error } = await context.admin
    .from('clients')
    .update({ full_name: form.full_name, email: form.email, phone: form.phone || null, address: form.address || null })
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
