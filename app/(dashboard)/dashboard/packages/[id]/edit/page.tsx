import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import EditPackageForm from './edit-form'

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: pkg } = await admin
    .from('packages')
    .select('*, package_addons(*)')
    .eq('package_id', id)
    .single()

  if (!pkg) redirect('/dashboard/packages')

  return <EditPackageForm pkg={pkg} />
}
