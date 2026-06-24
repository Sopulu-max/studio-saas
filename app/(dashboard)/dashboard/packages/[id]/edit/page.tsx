import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditPackageForm from './edit-form'

type EditPackageRecord = {
  package_id:           string
  name?:                string | null
  description?:         string | null
  base_price?:          number | string | null
  duration_mins?:       number | null
  shoot_type?:          string | null
  outfits_count?:       number | null
  edited_photos?:       number | null
  coverage_hours?:      number | null
  contract_template?:   string | null
  contract_template_id?: string | null
  session_type?:        string | null
  service_type?:        string | null
  pricing_type?:        'fixed' | 'per_project' | null
  inclusions?:          string[] | null
  tagline?:             string | null
  cover_url?:           string | null
  is_public?:           boolean | null
  display_order?:       number | null
  package_addons?:      { name?: string | null; description?: string | null; price?: number | string | null }[] | null
  package_sections?:    { section_id: string; title: string; body?: string | null; image_url?: string | null; video_url?: string | null; layout: string; display_order: number }[] | null
  package_inclusions?:  { inclusion_id: string; label: string; type: string; display_order: number }[] | null
}

type TemplateOption = { template_id: string; name: string; session_type: string | null }

export type AvailableService = {
  service_id:    string
  name:          string
  type:          string
  price?:        number | null
  description?:  string | null
}

export type LinkedPackageService = {
  service_id:  string
  is_addon:    boolean
  addon_price?: number | null
  display_order: number
}

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const [{ data: pkgRaw }, { data: servicesRaw }, { data: pkgServicesRaw }, { data: templatesRaw }] = await Promise.all([
    context.admin
      .from('packages')
      .select('*, package_addons(*), package_sections(section_id, title, body, image_url, video_url, layout, display_order), package_inclusions(inclusion_id, label, type, display_order)')
      .eq('package_id', id)
      .eq('studio_id', context.studioId)
      .single(),
    // All active services for this studio (for the picker)
    context.admin
      .from('services')
      .select('service_id, name, type, price, description')
      .eq('studio_id', context.studioId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    // Existing package ↔ service links
    context.admin
      .from('package_services')
      .select('service_id, is_addon, addon_price, display_order')
      .eq('package_id', id)
      .order('display_order', { ascending: true }),
    // Contract templates for selector
    context.admin
      .from('contract_templates')
      .select('template_id, name, session_type')
      .eq('studio_id', context.studioId)
      .order('display_order', { ascending: true }),
  ])

  if (!pkgRaw) redirect('/dashboard/packages')

  const pkg = pkgRaw as unknown as EditPackageRecord

  // Sort related rows by display_order
  if (pkg.package_sections) {
    pkg.package_sections.sort((a, b) => a.display_order - b.display_order)
  }
  if (pkg.package_inclusions) {
    pkg.package_inclusions.sort((a, b) => a.display_order - b.display_order)
  }

  const availableServices  = (servicesRaw   ?? []) as unknown as AvailableService[]
  const linkedPkgServices  = (pkgServicesRaw ?? []) as unknown as LinkedPackageService[]
  const templates          = (templatesRaw   ?? []) as unknown as TemplateOption[]

  return (
    <EditPackageForm
      pkg={pkg}
      availableServices={availableServices}
      linkedPkgServices={linkedPkgServices}
      templates={templates}
    />
  )
}
