'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  studioName: z.string().min(2, 'Studio name must be at least 2 characters'),
})

export async function signUpWithStudio(
  email: string,
  password: string,
  studioName: string
) {
  const result = signUpSchema.safeParse({ email, password, studioName })
  if (!result.success) return { error: result.error.issues[0].message }

  const supabase = await createClient()

  const { data, error: signupError } = await supabase.auth.signUp({ email, password })
  if (signupError || !data.user) {
    return { error: signupError?.message ?? 'Signup failed' }
  }

  const slug = studioName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  const admin = createAdminClient()
  const { error: studioError } = await admin.from('studios').insert({
    name: studioName,
    slug,
    owner_id: data.user.id,
    email,
  })

  if (studioError) {
    return { error: studioError.message }
  }

  return { error: null }
}