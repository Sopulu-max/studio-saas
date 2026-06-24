'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsPackage } from '@/lib/studio'

const packageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().optional().default(''),
  base_price: z.string().refine(v => parseFloat(v) >= 0, 'Price must be 0 or more'),
  shoot_type: z.string().min(1, 'Category is required'),
  inclusions: z.array(z.string()),
  coverage_hours: z.string().optional(),
  addons: z.array(z.object({
    name: z.string().min(1, 'Add-on name is required'),
    description: z.string().optional().default(''),
    price: z.string().refine(v => parseFloat(v) >= 0, 'Add-on price must be 0 or more'),
  })),
  pricing_type:   z.enum(['fixed', 'per_project']).optional().default('fixed'),
  is_public:      z.boolean().optional().default(true),
  display_order:  z.number().optional().default(0),
})

type Section = {
  title:     string
  body:      string
  image_url: string
  video_url: string
  layout?:   string
}

type TypedInclusion = {
  label: string
  type: 'service' | 'product' | 'digital'
}

type LinkedService = {
  service_id: string
  is_addon:   boolean
  addon_price?: string
}

// ─── Add ────────────────────────────────────────────────────────────────────

export async function addPackage(form: {
  name: string
  description: string
  base_price: string
  shoot_type: string
  inclusions: string[]
  coverage_hours?: string
  contract_template?: string
  contract_template_id?: string | null
  pricing_type?: string
  is_public?: boolean
  display_order?: number
  addons: { name: string; description: string; price: string }[]
  sections?: Section[]
  typed_inclusions?: TypedInclusion[]
  linked_services?: LinkedService[]
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
    if (byName) return { error: '__DUPLICATE__', existingPackageId: byName.package_id as string }
  }

  const { data: pkg, error } = await context.admin
    .from('packages')
    .insert({
      name:           form.name,
      description:    form.description,
      base_price:     parseFloat(form.base_price),
      shoot_type:     form.shoot_type,
      inclusions:     form.inclusions,
      coverage_hours: form.coverage_hours ? parseFloat(form.coverage_hours) : null,
      contract_template: form.contract_template || null,
      contract_template_id: form.contract_template_id || null,
      pricing_type:   form.pricing_type  || 'fixed',
      is_public:      form.is_public      ?? true,
      display_order:  form.display_order  ?? 0,
      studio_id:      context.studioId,
    })
    .select()
    .single()

  if (error || !pkg) return { error: error?.message ?? 'Failed to create package' }

  const pid = (pkg as { package_id: string }).package_id

  // Insert addons
  if (form.addons.length > 0) {
    const { error: addonError } = await context.admin
      .from('package_addons')
      .insert(form.addons.map(a => ({
        package_id:  pid,
        name:        a.name,
        description: a.description,
        price:       parseFloat(a.price),
      })))
    if (addonError) return { error: addonError.message }
  }

  // Insert sections
  if ((form.sections ?? []).length > 0) {
    const { error: sectionsError } = await context.admin
      .from('package_sections')
      .insert((form.sections!).map((s, i) => ({
        package_id:    pid,
        title:         s.title,
        body:          s.body || null,
        image_url:     s.image_url || null,
        video_url:     s.video_url || null,
        layout:        s.layout || 'standard',
        display_order: i,
      })))
    if (sectionsError) return { error: sectionsError.message }
  }

  // Insert typed inclusions
  if ((form.typed_inclusions ?? []).length > 0) {
    const { error: inclError } = await context.admin
      .from('package_inclusions')
      .insert((form.typed_inclusions!).map((inc, i) => ({
        package_id:    pid,
        label:         inc.label,
        type:          inc.type,
        display_order: i,
      })))
    if (inclError) return { error: inclError.message }
  }

  // Insert linked services
  const linkedServices = (form.linked_services ?? []).filter(ls => ls.service_id)
  if (linkedServices.length > 0) {
    const { error: svcError } = await context.admin
      .from('package_services')
      .insert(linkedServices.map((ls, i) => ({
        package_id:    pid,
        service_id:    ls.service_id,
        is_addon:      ls.is_addon,
        addon_price:   ls.addon_price ? parseFloat(ls.addon_price) : null,
        display_order: i,
      })))
    if (svcError) return { error: svcError.message }
  }

  revalidatePath('/dashboard/packages')
  return { error: null, packageId: pid }
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updatePackage(packageId: string, form: {
  name: string
  description: string
  base_price: string
  shoot_type: string
  inclusions: string[]
  coverage_hours?: string
  contract_template?: string
  contract_template_id?: string | null
  pricing_type?: string
  is_public?: boolean
  display_order?: number
  addons: { name: string; description: string; price: string }[]
  sections?: Section[]
  typed_inclusions?: TypedInclusion[]
  linked_services?: LinkedService[]
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
    if (byName) return { error: '__DUPLICATE__', existingPackageId: byName.package_id as string }
  }

  const { error: updateError } = await context.admin
    .from('packages')
    .update({
      name:           form.name,
      description:    form.description,
      base_price:     parseFloat(form.base_price),
      shoot_type:     form.shoot_type,
      inclusions:     form.inclusions,
      coverage_hours: form.coverage_hours ? parseFloat(form.coverage_hours) : null,
      contract_template: form.contract_template || null,
      contract_template_id: form.contract_template_id || null,
      pricing_type:   form.pricing_type  || 'fixed',
      is_public:      form.is_public      ?? true,
      display_order:  form.display_order  ?? 0,
    })
    .eq('package_id', packageId)

  if (updateError) return { error: updateError.message }

  // Addons: delete all + re-insert
  await context.admin.from('package_addons').delete().eq('package_id', packageId)
  if (form.addons.length > 0) {
    const { error: addonError } = await context.admin
      .from('package_addons')
      .insert(form.addons.map(a => ({
        package_id:  packageId,
        name:        a.name,
        description: a.description,
        price:       parseFloat(a.price),
      })))
    if (addonError) return { error: addonError.message }
  }

  // Sections: delete all + re-insert
  await context.admin.from('package_sections').delete().eq('package_id', packageId)
  if ((form.sections ?? []).length > 0) {
    const { error: sectionsError } = await context.admin
      .from('package_sections')
      .insert((form.sections!).map((s, i) => ({
        package_id:    packageId,
        title:         s.title,
        body:          s.body || null,
        image_url:     s.image_url || null,
        video_url:     s.video_url || null,
        layout:        s.layout || 'standard',
        display_order: i,
      })))
    if (sectionsError) return { error: sectionsError.message }
  }

  // Typed inclusions: delete all + re-insert
  await context.admin.from('package_inclusions').delete().eq('package_id', packageId)
  if ((form.typed_inclusions ?? []).length > 0) {
    const { error: inclError } = await context.admin
      .from('package_inclusions')
      .insert((form.typed_inclusions!).map((inc, i) => ({
        package_id:    packageId,
        label:         inc.label,
        type:          inc.type,
        display_order: i,
      })))
    if (inclError) return { error: inclError.message }
  }

  // Linked services: delete all + re-insert
  await context.admin.from('package_services').delete().eq('package_id', packageId)
  const linkedServices = (form.linked_services ?? []).filter(ls => ls.service_id)
  if (linkedServices.length > 0) {
    const { error: svcError } = await context.admin
      .from('package_services')
      .insert(linkedServices.map((ls, i) => ({
        package_id:    packageId,
        service_id:    ls.service_id,
        is_addon:      ls.is_addon,
        addon_price:   ls.addon_price ? parseFloat(ls.addon_price) : null,
        display_order: i,
      })))
    if (svcError) return { error: svcError.message }
  }

  revalidatePath('/dashboard/packages')
  revalidatePath(`/dashboard/packages/${packageId}`)
  return { error: null }
}

// ─── Update cover ────────────────────────────────────────────────────────────

export async function updatePackageCover(packageId: string, coverUrl: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsPackage(context.admin, context.studioId, packageId))) {
    return { error: 'Package not found' }
  }

  const { error } = await context.admin
    .from('packages')
    .update({ cover_url: coverUrl || null })
    .eq('package_id', packageId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/packages')
  revalidatePath(`/dashboard/packages/${packageId}`)
  return { error: null }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

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
