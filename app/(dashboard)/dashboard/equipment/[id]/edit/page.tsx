import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'
import EditEquipmentForm from './edit-equipment-form'

export default async function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const [{ data: itemRaw }, studio] = await Promise.all([
    context.admin.from('equipment').select('*').eq('equipment_id', id).eq('studio_id', context.studioId).single(),
    fetchStudio(context.admin, context.studioId),
  ])

  type EquipmentItem = {
    equipment_id: string; name: string; category: string
    serial_number?: string | null; status: string
    notes?: string | null; purchase_date?: string | null; purchase_price?: number | null
  }
  const item = itemRaw as unknown as EquipmentItem | null
  if (!item) redirect('/dashboard/equipment')

  const config = buildStudioConfig(
    studio?.session_types, studio?.booking_statuses, studio?.service_types,
    studio?.equipment_categories, studio?.staff_roles,
  )

  return <EditEquipmentForm equipmentId={id} item={item} categories={config.equipmentCategories} />
}
