import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { getSessionFormData } from '@/app/actions/sessions'
import EditSessionForm from './edit-session-form'

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: sessionRaw } = await context.admin
    .from('bookings')
    .select(`
      *,
      booking_staff ( role, staff_id, staff ( full_name ) )
    `)
    .eq('booking_id', id)
    .eq('studio_id', context.studioId)
    .single()
  type SessionEditRecord = {
    client_id?: string | null
    session_type?: string | null
    service_type?: string | null
    session_date?: string | null
    package_id?: string | null
    outfits_count?: number | null
    edited_photos?: number | null
    location_address?: string | null
    event_name?: string | null
    event_date?: string | null
    notes?: string | null
    booking_staff?: { role?: string | null; staff_id?: string | null }[] | null
  }
  const session = sessionRaw as unknown as SessionEditRecord | null

  if (!session) redirect('/dashboard/sessions')

  const { clients, packages, staff } = await getSessionFormData()

  // Pull all crew roles from existing assignments
  const staffRelations = (session.booking_staff ?? []) as { role?: string | null; staff_id?: string | null }[]
  const photographerId  = staffRelations.find(s => s.role === 'photographer')?.staff_id ?? ''
  const editorId        = staffRelations.find(s => s.role === 'editor')?.staff_id ?? ''
  const videographerId  = staffRelations.find(s => s.role === 'videographer')?.staff_id ?? ''
  const videoEditorId   = staffRelations.find(s => s.role === 'video_editor')?.staff_id ?? ''

  return (
    <EditSessionForm
      sessionId={id}
      session={session}
      clients={clients}
      packages={packages}
      staff={staff}
      photographerId={photographerId}
      editorId={editorId}
      videographerId={videographerId}
      videoEditorId={videoEditorId}
    />
  )
}
