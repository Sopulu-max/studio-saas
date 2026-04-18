import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NewContractForm from './new-contract-form'

export default async function NewContractPage({
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
    .select('studio_id, contract_templates')
    .eq('owner_id', user!.id)
    .single()

  const { data: bookings } = await admin
    .from('bookings')
    .select('booking_id, session_date, status, session_type, clients(full_name, phone), packages(package_id, contract_template)')
    .eq('studio_id', studio?.studio_id)
    .not('status', 'eq', 'cancelled')
    .order('session_date', { ascending: false })

  type Templates = { studio: string; outdoor: string; event: string }
  const rawT = (studio?.contract_templates ?? {}) as Partial<Templates>
  const templates: Templates = {
    studio:  rawT.studio  ?? '',
    outdoor: rawT.outdoor ?? '',
    event:   rawT.event   ?? '',
  }

  return (
    <NewContractForm
      bookings={(bookings ?? []) as any[]}
      preselectedSessionId={session ?? ''}
      templates={templates}
    />
  )
}
