'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'
import { z } from 'zod'

const storefrontSchema = z.object({
  bio: z.string().max(1000, 'Bio is too long').nullable(),
  theme: z.string().nullable(), // Will parse JSON safely
})

export async function updateStorefrontSettings(formData: FormData) {
  const context = await getStudioContext()
  if ('error' in context) return { error: 'Unauthorized' }
  if (context.role !== 'owner') return { error: 'Only studio owners can update the storefront' }

  const bioVal = formData.get('bio')
  const bio = bioVal ? String(bioVal) : null
  const themeVal = formData.get('theme')
  const themeStr = themeVal ? String(themeVal) : null

  const parsed = storefrontSchema.safeParse({ bio, theme: themeStr })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let theme = undefined
  if (parsed.data.theme) {
    try {
      theme = JSON.parse(parsed.data.theme)
    } catch (e) {
      return { error: 'Invalid theme format' }
    }
  }

  const updateData: any = { bio: parsed.data.bio }
  if (theme !== undefined) {
    updateData.theme = theme
  }

  const { error } = await context.admin
    .from('studios')
    .update(updateData)
    .eq('studio_id', context.studioId)

  if (error) {
    console.error('Error updating storefront settings:', error)
    return { error: 'Failed to update settings' }
  }

  revalidatePath('/dashboard/storefront')
  revalidatePath('/dashboard/settings')
  // We cannot easily revalidate /[slug] because revalidatePath doesn't support dynamic segments easily without the actual slug, but we'll try to revalidate the layout.
  revalidatePath('/', 'layout')

  return { success: true }
}
