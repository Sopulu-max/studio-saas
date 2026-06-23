'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsService } from '@/lib/studio'

const serviceSchema = z.object({
  name:          z.string().min(1, 'Service name is required'),
  type:          z.enum(['service', 'product', 'digital'], { error: 'Invalid type' }),
  description:   z.string().optional().default(''),
  price:         z.string().optional().default(''),
  duration_mins: z.string().optional().default(''),
  is_active:     z.boolean().optional().default(true),
  display_order: z.string().optional().default('0'),
  category_value: z.string().optional().nullable(),
  session_type:  z.string().optional().nullable(),
  outfits_count: z.string().optional().nullable(),
})

export async function addService(form: {
  name: string
  type: string
  description?: string
  price?: string
  duration_mins?: string
  is_active?: boolean
  display_order?: string
  category_value?: string | null
  session_type?: string | null
  outfits_count?: string | null
}) {
  const result = serviceSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { data: svc, error } = await context.admin
    .from('services')
    .insert({
      studio_id:    context.studioId,
      name:         form.name.trim(),
      type:         form.type,
      description:  form.description?.trim() || null,
      price:        form.price ? parseFloat(form.price) : null,
      duration_mins: form.duration_mins ? parseInt(form.duration_mins, 10) : null,
      is_active:    form.is_active ?? true,
      display_order: parseInt(form.display_order ?? '0', 10) || 0,
      category_value: form.category_value || null,
      session_type:  form.session_type || null,
      outfits_count: form.outfits_count ? parseInt(form.outfits_count, 10) : null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/services')
  return { error: null, serviceId: svc?.service_id ?? null }
}

export async function updateService(serviceId: string, form: {
  name: string
  type: string
  description?: string
  price?: string
  duration_mins?: string
  is_active?: boolean
  display_order?: string
  category_value?: string | null
  session_type?: string | null
  outfits_count?: string | null
}) {
  const result = serviceSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsService(context.admin, context.studioId, serviceId))) {
    return { error: 'Service not found' }
  }

  const { error } = await context.admin
    .from('services')
    .update({
      name:         form.name.trim(),
      type:         form.type,
      description:  form.description?.trim() || null,
      price:        form.price ? parseFloat(form.price) : null,
      duration_mins: form.duration_mins ? parseInt(form.duration_mins, 10) : null,
      is_active:    form.is_active ?? true,
      display_order: parseInt(form.display_order ?? '0', 10) || 0,
      category_value: form.category_value || null,
      session_type:  form.session_type || null,
      outfits_count: form.outfits_count ? parseInt(form.outfits_count, 10) : null,
    })
    .eq('service_id', serviceId)

  if (!error) {
    revalidatePath(`/dashboard/services/${serviceId}`)
    revalidatePath('/dashboard/services')
  }
  return { error: error?.message ?? null }
}

export async function toggleServiceActive(serviceId: string, isActive: boolean) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsService(context.admin, context.studioId, serviceId))) {
    return { error: 'Service not found' }
  }

  const { error } = await context.admin
    .from('services')
    .update({ is_active: isActive })
    .eq('service_id', serviceId)

  if (!error) {
    revalidatePath(`/dashboard/services/${serviceId}`)
    revalidatePath('/dashboard/services')
  }
  return { error: error?.message ?? null }
}

export async function deleteService(serviceId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsService(context.admin, context.studioId, serviceId))) {
    return { error: 'Service not found' }
  }

  const { error } = await context.admin
    .from('services')
    .delete()
    .eq('service_id', serviceId)

  if (!error) revalidatePath('/dashboard/services')
  return { error: error?.message ?? null }
}
