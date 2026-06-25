import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditContractForm from './edit-contract-form'
import { unwrapRow } from "@/lib/utils";

type EditContractRow = {
  contract_id: string
  content: string | null
  status: string | null
  bookings: { clients?: { full_name?: string | null } | null } | null
}

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: contractRaw } = await context.admin
    .from('contracts')
    .select('contract_id, content, status, bookings!inner(studio_id, clients(full_name))')
    .eq('contract_id', id)
    .eq('bookings.studio_id', context.studioId)
    .single()

  if (!contractRaw) redirect('/dashboard/contracts')

  const contract = contractRaw as unknown as EditContractRow

  if (contract.status !== 'draft') redirect(`/dashboard/contracts/${id}`)

  const clientName = unwrapRow(unwrapRow(contract.bookings)?.clients)?.full_name ?? ''

  return <EditContractForm contractId={id} content={contract.content ?? ''} clientName={clientName} />
}
