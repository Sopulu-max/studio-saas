import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditStaffForm from './edit-staff-form'

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: member } = await context.admin
    .from('staff')
    .select('staff_id, full_name, email, role, phone, hire_date')
    .eq('staff_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!member) redirect('/dashboard/staff')

  return <EditStaffForm staffId={id} member={member} />
}
