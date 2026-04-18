import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NewGalleryForm from './new-gallery-form'

export default async function NewGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: studio } = await admin
    .from('studios')
    .select('studio_id')
    .eq('owner_id', user!.id)
    .single()

  const { data: bookings } = await admin
    .from('bookings')
    .select('booking_id, session_date, clients(full_name, phone), packages(name)')
    .eq('studio_id', studio?.studio_id)
    .not('status', 'eq', 'cancelled')
    .order('session_date', { ascending: false })

  return <NewGalleryForm bookings={bookings ?? []} preselectedSessionId={session ?? ''} />
}
