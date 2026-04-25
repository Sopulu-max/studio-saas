import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditPackageForm from './edit-form'

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: pkg } = await context.admin
    .from('packages')
    .select('*, package_addons(*)')
    .eq('package_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!pkg) redirect('/dashboard/packages')

  return <EditPackageForm pkg={pkg} />
}
