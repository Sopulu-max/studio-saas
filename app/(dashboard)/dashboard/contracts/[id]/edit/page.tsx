import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditContractForm from './edit-contract-form'

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: contract } = await context.admin
    .from('contracts')
    .select('contract_id, content, status, bookings!inner(studio_id, clients(full_name))')
    .eq('contract_id', id)
    .eq('bookings.studio_id', context.studioId)
    .single()

  if (!contract) redirect('/dashboard/contracts')
  if (contract.status !== 'draft') redirect(`/dashboard/contracts/${id}`)

  const clientName = (contract.bookings as any)?.clients?.full_name ?? ''

  return <EditContractForm contractId={id} content={contract.content ?? ''} clientName={clientName} />
}
