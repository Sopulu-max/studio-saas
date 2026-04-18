import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { getSessionFormData } from '@/app/actions/sessions'
import EditSessionForm from './edit-session-form'

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: session } = await context.admin
    .from('bookings')
    .select(`
      *,
      booking_staff ( role, staff_id, staff ( full_name ) )
    `)
    .eq('booking_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!session) redirect('/dashboard/sessions')

  const { clients, packages, staff } = await getSessionFormData()

  // Pull photographer and editor from existing assignments
  const staffRelations = (session.booking_staff ?? []) as { role?: string | null; staff_id?: string | null }[]
  const photographerId = staffRelations.find(s => s.role === 'photographer')?.staff_id ?? ''
  const editorId       = staffRelations.find(s => s.role === 'editor')?.staff_id ?? ''

  return (
    <EditSessionForm
      sessionId={id}
      session={session}
      clients={clients}
      packages={packages}
      staff={staff}
      photographerId={photographerId}
      editorId={editorId}
    />
  )
}
