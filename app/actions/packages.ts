'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsPackage } from '@/lib/studio'

const packageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().optional().default(''),
  base_price: z.string().refine(v => parseFloat(v) > 0, 'Price must be greater than 0'),
  duration_mins: z.string().refine(v => parseInt(v, 10) > 0, 'Duration must be greater than 0'),
  session_type: z.string().min(1, 'Session type is required'),
  shoot_type: z.string().min(1, 'Category is required'),
  inclusions: z.array(z.string()),
  outfits_count: z.string().optional(),
  edited_photos: z.string().optional(),
  coverage_hours: z.string().optional(),
  addons: z.array(z.object({
    name: z.string().min(1, 'Add-on name is required'),
    description: z.string().optional().default(''),
    price: z.string().refine(v => parseFloat(v) >= 0, 'Add-on price must be 0 or more'),
  })),
})

export async function addPackage(form: {
  name: string
  description: string
  base_price: string
  duration_mins: string
  session_type: string
  service_type?: string
  shoot_type: string
  inclusions: string[]
  outfits_count?: string
  edited_photos?: string
  coverage_hours?: string
  contract_template?: string
  pricing_type?: string
  addons: { name: string; description: string; price: string }[]
  force_duplicate?: boolean
}) {
  const result = packageSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!form.force_duplicate) {
    const { data: byName } = await context.admin
      .from('packages')
      .select('package_id, name')
      .eq('studio_id', context.studioId)
      .ilike('name', form.name.trim())
      .maybeSingle()
    if (byName) return { error: '__DUPLICATE__', existingPackageId: byName.package_id }
  }

  const { data: pkg, error } = await context.admin
    .from('packages')
    .insert({
      name: form.name,
      description: form.description,
      base_price: parseFloat(form.base_price),
      duration_mins: parseInt(form.duration_mins, 10),
      session_type: form.session_type,
      service_type: form.service_type || 'photo',
      shoot_type: form.shoot_type,
      inclusions: form.inclusions,
      outfits_count: form.outfits_count ? parseInt(form.outfits_count, 10) : null,
      edited_photos: form.edited_photos ? parseInt(form.edited_photos, 10) : null,
      coverage_hours: form.coverage_hours ? parseFloat(form.coverage_hours) : null,
      contract_template: form.contract_template || null,
      pricing_type: form.pricing_type || 'fixed',
      studio_id: context.studioId,
    })
    .select()
    .single()

  if (error || !pkg) return { error: error?.message ?? 'Failed to create package' }

  if (form.addons.length > 0) {
    const { error: addonError } = await context.admin
      .from('package_addons')
      .insert(form.addons.map(a => ({
        package_id: pkg.package_id,
        name: a.name,
        description: a.description,
        price: parseFloat(a.price),
      })))
    if (addonError) return { error: addonError.message }
  }

  return { error: null, packageId: pkg.package_id }
}

export async function updatePackage(packageId: string, form: {
  name: string
  description: string
  base_price: string
  duration_mins: string
  session_type: string
  service_type?: string
  shoot_type: string
  inclusions: string[]
  outfits_count?: string
  edited_photos?: string
  coverage_hours?: string
  contract_template?: string
  pricing_type?: string
  addons: { name: string; description: string; price: string }[]
  force_duplicate?: boolean
}) {
  const result = packageSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsPackage(context.admin, context.studioId, packageId))) {
    return { error: 'Package not found' }
  }

  if (!form.force_duplicate) {
    const { data: byName } = await context.admin
      .from('packages')
      .select('package_id, name')
      .eq('studio_id', context.studioId)
      .ilike('name', form.name.trim())
      .neq('package_id', packageId)
      .maybeSingle()
    if (byName) return { error: '__DUPLICATE__', existingPackageId: byName.package_id }
  }

  const { error: updateError } = await context.admin
    .from('packages')
    .update({
      name: form.name,
      description: form.description,
      base_price: parseFloat(form.base_price),
      duration_mins: parseInt(form.duration_mins, 10),
      session_type: form.session_type,
      service_type: form.service_type || 'photo',
      shoot_type: form.shoot_type,
      inclusions: form.inclusions,
      outfits_count: form.outfits_count ? parseInt(form.outfits_count, 10) : null,
      edited_photos: form.edited_photos ? parseInt(form.edited_photos, 10) : null,
      coverage_hours: form.coverage_hours ? parseFloat(form.coverage_hours) : null,
      contract_template: form.contract_template || null,
      pricing_type: form.pricing_type || 'fixed',
    })
    .eq('package_id', packageId)

  if (updateError) return { error: updateError.message }

  // Delete all existing addons and re-insert
  await context.admin.from('package_addons').delete().eq('package_id', packageId)

  if (form.addons.length > 0) {
    const { error: addonError } = await context.admin
      .from('package_addons')
      .insert(form.addons.map(a => ({
        package_id: packageId,
        name: a.name,
        description: a.description,
        price: parseFloat(a.price),
      })))
    if (addonError) return { error: addonError.message }
  }

  revalidatePath('/dashboard/packages')
  return { error: null }
}

export async function deletePackage(packageId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsPackage(context.admin, context.studioId, packageId))) {
    return { error: 'Package not found' }
  }

  const { error } = await context.admin
    .from('packages')
    .delete()
    .eq('package_id', packageId)
  return { error: error?.message ?? null }
}
