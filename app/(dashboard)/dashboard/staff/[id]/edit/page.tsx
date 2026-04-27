import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditStaffForm from './edit-staff-form'

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  type StaffRecord = {
    staff_id: string; full_name: string; email: string
    roles: string[] | null; role: string | null; phone: string | null
    hire_date: string | null; working_days: string[] | null
  }
  const { data: memberRaw } = await context.admin
    .from('staff')
    .select('staff_id, full_name, email, roles, role, phone, hire_date, working_days')
    .eq('staff_id', id)
    .eq('studio_id', context.studioId)
    .single()

  const member = memberRaw as unknown as StaffRecord | null
  if (!member) redirect('/dashboard/staff')

  return <EditStaffForm staffId={id} member={member} />
}
