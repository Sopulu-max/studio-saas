import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import NewPackageForm from './new-package-form'

type TemplateOption = { template_id: string; name: string; session_type: string | null }

export default async function NewPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ outfits?: string; photos?: string; price?: string; session_type?: string }>
}) {
  const { outfits, photos, price, session_type } = await searchParams
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: templatesRaw } = await context.admin
    .from('contract_templates')
    .select('template_id, name, session_type')
    .eq('studio_id', context.studioId)
    .order('display_order', { ascending: true })

  const templates = (templatesRaw ?? []) as unknown as TemplateOption[]

  return (
    <NewPackageForm
      templates={templates}
      defaultOutfits={outfits}
      defaultPhotos={photos}
      defaultPrice={price}
      defaultSessionType={session_type}
    />
  )
}
