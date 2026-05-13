import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditServiceForm from './edit-form'

type ServiceRecord = {
  service_id:    string
  name:          string
  type:          string
  description?:  string | null
  price?:        number | null
  duration_mins?: number | null
  is_active:     boolean
  display_order: number
}

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: svcRaw } = await context.admin
    .from('services')
    .select('*')
    .eq('service_id', id)
    .eq('studio_id', context.studioId)
    .single()

  const svc = svcRaw as unknown as ServiceRecord | null
  if (!svc) redirect('/dashboard/services')

  return <EditServiceForm svc={svc} />
}
