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
    packages: { package_id: string; name: string | null } | null
  }

  type TemplateRow = { template_id: string; name: string; description: string | null; session_type: string | null; display_order: number }
  type ClauseRow   = { clause_id: string; template_id: string; title: string; body: string; display_order: number }

  let bookingsQuery = context.admin
    .from('bookings')
    .select('booking_id, booking_ref, session_date, status, session_type, clients(full_name, phone), packages(package_id, name)')
    .eq('studio_id', context.studioId)
    .order('session_date', { ascending: false })
  for (const v of cancelValues) { bookingsQuery = bookingsQuery.neq('status', v) }

  const [
    { data: bookings },
    { data: rawTemplates },
    { data: rawClauses },
  ] = await Promise.all([
    bookingsQuery,
    context.admin
      .from('contract_templates')
      .select('template_id, name, description, session_type, display_order')
      .eq('studio_id', context.studioId)
      .order('display_order', { ascending: true }),
    context.admin
      .from('contract_clauses')
      .select('clause_id, template_id, title, body, display_order')
      .order('display_order', { ascending: true }),
  ])

  const templates = (rawTemplates ?? []) as unknown as TemplateRow[]
  const allClauses = (rawClauses ?? []) as unknown as ClauseRow[]

  const contractTemplates = templates.map(t => ({
    template_id:   t.template_id,
    name:          t.name,
    description:   t.description ?? '',
    session_type:  t.session_type ?? '',
    display_order: t.display_order,
    clauses: allClauses
      .filter(c => c.template_id === t.template_id)
      .map(c => ({ clause_id: c.clause_id, title: c.title, body: c.body, display_order: c.display_order })),
  }))

  const studioInfo = {
    name:    studio?.name    ?? '',
    email:   studio?.email   ?? '',
    phone:   studio?.phone   ?? '',
    address: studio?.address ?? '',
  }

  return (
    <NewContractForm
      bookings={(bookings ?? []) as unknown as BookingOption[]}
      preselectedSessionId={session ?? ''}
      templates={contractTemplates}
      studio={studioInfo}
    />
  )
}
