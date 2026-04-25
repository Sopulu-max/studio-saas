import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import NewContractForm from './new-contract-form'

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: studio } = await context.admin
    .from('studios')
    .select('studio_id, contract_templates')
    .eq('studio_id', context.studioId)
    .single()

  type BookingOption = {
    booking_id: string
    session_date: string | null
    status: string | null
    session_type: string | null
    clients: { full_name: string | null; phone: string | null } | null
    packages: { package_id: string; contract_template: string | null } | null
  }

  const { data: bookings } = await context.admin
    .from('bookings')
    .select('booking_id, session_date, status, session_type, clients(full_name, phone), packages(package_id, contract_template)')
    .eq('studio_id', context.studioId)
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
      bookings={(bookings ?? []) as BookingOption[]}
      preselectedSessionId={session ?? ''}
      templates={templates}
    />
  )
}
