'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'
import { z } from 'zod'

const bioSchema = z.object({
  bio: z.string().max(1000, 'Bio is too long').nullable(),
})

export async function updateStudioBio(formData: FormData) {
  const context = await getStudioContext()
  if ('error' in context) return { error: 'Unauthorized' }
  if (context.role !== 'owner') return { error: 'Only studio owners can update the storefront' }

  const bioVal = formData.get('bio')
  const bio = bioVal ? String(bioVal) : null

  const parsed = bioSchema.safeParse({ bio })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await context.admin
    .from('studios')
    .update({ bio: parsed.data.bio })
    .eq('studio_id', context.studioId)

  if (error) {
    console.error('Error updating bio:', error)
    return { error: 'Failed to update bio' }
  }

  revalidatePath('/dashboard/storefront')
  revalidatePath('/dashboard/settings')
  // We cannot easily revalidate /[slug] because revalidatePath doesn't support dynamic segments easily without the actual slug, but we'll try to revalidate the layout.
  revalidatePath('/', 'layout')

  return { success: true }
}
