import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'
import NewContractForm from './new-contract-form'

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)
  const config = buildStudioConfig(studio?.session_types, studio?.booking_statuses, studio?.service_types)
  const cancelValues = config.bookingStatuses.filter(s => s.is_cancellation).map(s => s.value)

  type BookingOption = {
    booking_id: string
    booking_ref: number | null
    session_date: string | null
    status: string | null
    session_type: string | null
    clients: { full_name: string | null; phone: string | null } | null
    packages: { package_id: string; contract_template: string | null } | null
  }

  let bookingsQuery = context.admin
    .from('bookings')
    .select('booking_id, booking_ref, session_date, status, session_type, clients(full_name, phone), packages(package_id, contract_template)')
    .eq('studio_id', context.studioId)
    .order('session_date', { ascending: false })
  for (const v of cancelValues) { bookingsQuery = bookingsQuery.neq('status', v) }
  const { data: bookings } = await bookingsQuery

  type Templates = { studio: string; outdoor: string; event: string }
  const rawT = (studio?.contract_templates ?? {}) as Partial<Templates>
  const templates: Templates = {
    studio:  rawT.studio  ?? '',
    outdoor: rawT.outdoor ?? '',
    event:   rawT.event   ?? '',
  }

  return (
    <NewContractForm
      bookings={(bookings ?? []) as unknown as BookingOption[]}
      preselectedSessionId={session ?? ''}
      templates={templates}
    />
  )
}
