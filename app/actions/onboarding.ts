'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStudioContext } from '@/lib/studio'
import type { SessionTypeConfig } from '@/lib/studio-config'

const schema = z.object({
  name:         z.string().min(2, 'Studio name must be at least 2 characters'),
  slug:         z.string().min(2).regex(/^[a-z0-9-]+$/, 'URL can only contain lowercase letters, numbers, and dashes'),
  timezone:     z.string().min(1, 'Please select a timezone'),
  phone:        z.string().optional(),
  sessionTypes: z.array(z.object({
    value:    z.string(),
    label:    z.string(),
    color_bg: z.string(),
    color_fg: z.string(),
  })).min(1, 'Add at least one session type'),
})

export async function completeOnboarding(data: {
  name: string
  slug: string
  timezone: string
  phone?: string
  sessionTypes: SessionTypeConfig[]
}): Promise<{ error: string | null }> {
  const context = await getStudioContext()
  if ('error' in context) return { error: 'Not authenticated' }

  const parsed = schema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()

  // Check slug uniqueness
  const { data: existing } = await admin
    .from('studios')
    .select('studio_id')
    .eq('slug', data.slug)
    .neq('studio_id', context.studioId)
    .maybeSingle()

  if (existing) return { error: 'That booking URL is already taken. Please choose a different one.' }

  const { error } = await admin
    .from('studios')
    .update({
      name:                    data.name.trim(),
      slug:                    data.slug.trim(),
      timezone:                data.timezone,
      phone:                   data.phone?.trim() || null,
      session_types:           data.sessionTypes,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('studio_id', context.studioId)

  // PostgREST schema cache error (column doesn't exist in this deployment's DB)
  // or Postgres undefined_column (42703) — retry with only the core columns we know exist
  const isMissingColumn = error?.code === '42703' || error?.message?.includes('schema cache')
  if (isMissingColumn) {
    const { error: error2 } = await admin
      .from('studios')
      .update({
        name:                    data.name.trim(),
        slug:                    data.slug.trim(),
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('studio_id', context.studioId)
    return { error: error2?.message ?? null }
  }

  return { error: error?.message ?? null }
}
