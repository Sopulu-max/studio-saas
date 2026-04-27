import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditEquipmentForm from './edit-equipment-form'

export default async function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: itemRaw } = await context.admin
    .from('equipment')
    .select('*')
    .eq('equipment_id', id)
    .eq('studio_id', context.studioId)
    .single()

  type EquipmentItem = {
    equipment_id: string; name: string; category: string
    serial_number?: string | null; status: string
  }
  const item = itemRaw as unknown as EquipmentItem | null
  if (!item) redirect('/dashboard/equipment')

  return <EditEquipmentForm equipmentId={id} item={item} />
}
