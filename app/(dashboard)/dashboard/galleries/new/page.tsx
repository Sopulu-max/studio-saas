import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import NewGalleryForm from './new-gallery-form'

export default async function NewGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  type BookingOption = {
    booking_id: string
    session_date: string | null
    session_type: string | null
    clients: { full_name: string | null; phone: string | null } | null
  }

  const { data: bookings } = await context.admin
    .from('bookings')
    .select('booking_id, session_date, session_type, clients(full_name, phone)')
    .eq('studio_id', context.studioId)
    .not('status', 'eq', 'cancelled')
    .order('session_date', { ascending: false })

  return <NewGalleryForm bookings={(bookings ?? []) as unknown as BookingOption[]} preselectedSessionId={session ?? ''} />
}
