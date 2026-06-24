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
type Section = {
  title:     string
  body:      string
  image_url: string
  video_url: string
  layout?:   string
}

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
  booking_fields?: any[]
  sections?: Section[]
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
      booking_fields: form.booking_fields ?? [],
    })
    .select()
    .single()

  if (error) return { error: error.message }

  const svcId = svc?.service_id

  // Insert sections
  if (svcId && (form.sections ?? []).length > 0) {
    const { error: sectionsError } = await context.admin
      .from('service_sections')
      .insert((form.sections!).map((s, i) => ({
        service_id:    svcId,
        title:         s.title,
        body:          s.body || null,
        image_url:     s.image_url || null,
        video_url:     s.video_url || null,
        layout:        s.layout || 'standard',
        display_order: i,
      })))
    if (sectionsError) return { error: sectionsError.message }
  }

  revalidatePath('/dashboard/services')
  return { error: null, serviceId: svcId ?? null }
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
  booking_fields?: any[]
  sections?: Section[]
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
      booking_fields: form.booking_fields ?? [],
    })
    .eq('service_id', serviceId)

  if (error) return { error: error.message }

  // Sections: delete all + re-insert
  await context.admin.from('service_sections').delete().eq('service_id', serviceId)
  if ((form.sections ?? []).length > 0) {
    const { error: sectionsError } = await context.admin
      .from('service_sections')
      .insert((form.sections!).map((s, i) => ({
        service_id:    serviceId,
        title:         s.title,
        body:          s.body || null,
        image_url:     s.image_url || null,
        video_url:     s.video_url || null,
        layout:        s.layout || 'standard',
        display_order: i,
      })))
    if (sectionsError) return { error: sectionsError.message }
  }

  revalidatePath(`/dashboard/services/${serviceId}`)
  revalidatePath('/dashboard/services')
  return { error: null }
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
