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
  category_value?: string | null
  session_type?: string | null
  outfits_count?: number | null
  booking_fields?: any[]
  service_sections?: {
    section_id:    string
    title:         string
    body:          string | null
    image_url:     string | null
    video_url:     string | null
    layout:        string
    display_order: number
  }[]
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
    .select('*, service_sections(section_id, title, body, image_url, video_url, layout, display_order)')
    .eq('service_id', id)
    .eq('studio_id', context.studioId)
    .single()

  const svc = svcRaw as unknown as ServiceRecord | null
  if (!svc) redirect('/dashboard/services')

  return <EditServiceForm svc={svc} />
}
