import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditPackageForm from './edit-form'

type EditPackageRecord = {
  package_id:        string
  name?:             string | null
  description?:      string | null
  base_price?:       number | string | null
  duration_mins?:    number | null
  shoot_type?:       string | null
  outfits_count?:    number | null
  edited_photos?:    number | null
  coverage_hours?:   number | null
  contract_template?: string | null
  session_type?:     string | null
  service_type?:     string | null
  pricing_type?:     'fixed' | 'per_project' | null
  inclusions?:       string[] | null
  tagline?:          string | null
  cover_url?:        string | null
  is_public?:        boolean | null
  display_order?:    number | null
  package_addons?:   { name?: string | null; description?: string | null; price?: number | string | null }[] | null
  package_sections?: { section_id: string; title: string; body?: string | null; image_url?: string | null; display_order: number }[] | null
  package_inclusions?: { inclusion_id: string; label: string; type: string; display_order: number }[] | null
}

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: pkgRaw } = await context.admin
    .from('packages')
    .select('*, package_addons(*), package_sections(section_id, title, body, image_url, display_order), package_inclusions(inclusion_id, label, type, display_order)')
    .eq('package_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!pkgRaw) redirect('/dashboard/packages')

  const pkg = pkgRaw as unknown as EditPackageRecord

  // Sort related rows by display_order
  if (pkg.package_sections) {
    pkg.package_sections.sort((a, b) => a.display_order - b.display_order)
  }
  if (pkg.package_inclusions) {
    pkg.package_inclusions.sort((a, b) => a.display_order - b.display_order)
  }

  return <EditPackageForm pkg={pkg} />
}
