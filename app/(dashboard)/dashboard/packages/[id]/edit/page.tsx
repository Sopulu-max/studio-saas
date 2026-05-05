import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditPackageForm from './edit-form'

type EditPackageRecord = {
  package_id: string
  name?: string | null
  description?: string | null
  base_price?: number | string | null
  duration_mins?: number | null
  shoot_type?: string | null
  outfits_count?: number | null
  edited_photos?: number | null
  coverage_hours?: number | null
  contract_template?: string | null
  session_type?: string | null
  service_type?: string | null
  pricing_type?: 'fixed' | 'per_project' | null
  inclusions?: string[] | null
  package_addons?: { name?: string | null; description?: string | null; price?: number | string | null }[] | null
}

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: pkgRaw } = await context.admin
    .from('packages')
    .select('*, package_addons(*)')
    .eq('package_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!pkgRaw) redirect('/dashboard/packages')

  const pkg = pkgRaw as unknown as EditPackageRecord

  return <EditPackageForm pkg={pkg} />
}
