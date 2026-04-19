'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'

const updateStudioSchema = z.object({
  name:     z.string().min(2, 'Studio name must be at least 2 characters'),
  email:    z.string().email('Invalid email address'),
  slug:     z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(60, 'Slug must be under 60 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only contain lowercase letters, numbers, and hyphens - no spaces or special characters'),
  phone:    z.string().optional().default(''),
  address:  z.string().optional().default(''),
  timezone: z.string().optional().default(''),
})

export async function updateStudio(form: {
  name: string
  email: string
  slug: string
  phone?: string
  address?: string
  timezone?: string
}) {
  const result = updateStudioSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { data: conflict } = await context.admin
    .from('studios')
    .select('studio_id')
    .eq('slug', form.slug)
    .neq('owner_id', context.userId)
    .maybeSingle()

  if (conflict) return { error: 'That slug is already taken - try another one' }

  const { error } = await context.admin
    .from('studios')
    .update({
      name:     form.name,
      email:    form.email,
      slug:     form.slug,
      phone:    form.phone    || null,
      address:  form.address  || null,
      timezone: form.timezone || null,
    })
    .eq('owner_id', context.userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard', 'layout')
  return { error: null }
}

export async function updateStudioLogo(logoUrl: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { error } = await context.admin
    .from('studios')
    .update({ logo_url: logoUrl })
    .eq('owner_id', context.userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard', 'layout')
  return { error: null }
}
