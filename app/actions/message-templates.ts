'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStudioContext } from '@/lib/studio'
import { revalidatePath } from 'next/cache'

const templateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  content: z.string().min(1, 'Message content is required').max(2000, 'Content is too long'),
})

export async function createTemplate(data: unknown) {
  const context = await getStudioContext()
  if ('error' in context) return { error: 'Unauthorized' }

  const parsed = templateSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { title, content } = parsed.data

  const { error } = await context.admin
    .from('message_templates')
    .insert({
      studio_id: context.studioId,
      title,
      content,
    })

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateTemplate(templateId: string, data: unknown) {
  const context = await getStudioContext()
  if ('error' in context) return { error: 'Unauthorized' }

  const parsed = templateSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { title, content } = parsed.data

  const { error } = await context.admin
    .from('message_templates')
    .update({ title, content })
    .eq('template_id', templateId)
    .eq('studio_id', context.studioId)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function deleteTemplate(templateId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: 'Unauthorized' }

  const { error } = await context.admin
    .from('message_templates')
    .delete()
    .eq('template_id', templateId)
    .eq('studio_id', context.studioId)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/settings')
  return { success: true }
}
