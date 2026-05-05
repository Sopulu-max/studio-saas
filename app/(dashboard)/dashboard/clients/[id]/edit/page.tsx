import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditClientForm from './edit-client-form'

type ClientEditRow = { client_id: string; full_name: string; email: string; phone: string | null; address: string | null }

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: clientRaw } = await context.admin
    .from('clients')
    .select('client_id, full_name, email, phone, address')
    .eq('client_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!clientRaw) redirect('/dashboard/clients')

  const client = clientRaw as unknown as ClientEditRow

  return <EditClientForm clientId={id} client={client} />
}
