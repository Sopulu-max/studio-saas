'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'
import { getLayout, saveLayout, BuilderBlock } from '@/lib/domains/builder/repository'

export async function fetchLayoutAction(type: string, status: 'draft' | 'published' = 'published') {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  try {
    const layout = await getLayout(context.admin, context.studioId, type, status)
    return { data: layout }
  } catch (err: any) {
    console.error('Failed to fetch layout:', err)
    return { error: 'Failed to fetch layout' }
  }
}

export async function saveLayoutAction(type: string, blocks: BuilderBlock[], status: 'draft' | 'published' = 'draft') {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  try {
    const layout = await saveLayout(context.admin, context.studioId, type, blocks, status)
    
    // Revalidate paths that might use this layout
    revalidatePath(`/(public)/[studioSlug]`, 'page')
    revalidatePath('/dashboard/storefront')
    
    return { data: layout }
  } catch (err: any) {
    console.error('Failed to save layout:', err)
    return { error: 'Failed to save layout' }
  }
}

export async function publishLayoutAction(type: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  try {
    // 1. Get draft
    const draft = await getLayout(context.admin, context.studioId, type, 'draft')
    if (!draft) return { error: 'No draft found to publish' }

    // 2. Save it as published
    const published = await saveLayout(context.admin, context.studioId, type, draft.blocks, 'published')
    
    revalidatePath(`/(public)/[studioSlug]`, 'page')
    
    return { data: published }
  } catch (err: any) {
    console.error('Failed to publish layout:', err)
    return { error: 'Failed to publish layout' }
  }
}
