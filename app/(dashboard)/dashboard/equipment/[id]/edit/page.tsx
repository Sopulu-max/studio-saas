import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditEquipmentForm from './edit-equipment-form'

export default async function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: item } = await context.admin
    .from('equipment')
    .select('*')
    .eq('equipment_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!item) redirect('/dashboard/equipment')

  return <EditEquipmentForm equipmentId={id} item={item} />
}
