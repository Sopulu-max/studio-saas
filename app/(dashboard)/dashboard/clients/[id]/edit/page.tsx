import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditClientForm from './edit-client-form'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: client } = await context.admin
    .from('clients')
    .select('client_id, full_name, email, phone, address')
    .eq('client_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!client) redirect('/dashboard/clients')

  return <EditClientForm clientId={id} client={client} />
}
