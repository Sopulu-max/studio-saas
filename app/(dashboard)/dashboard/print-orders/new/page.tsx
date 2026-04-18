import { getPrintOrderFormData } from '@/app/actions/print-orders'
import NewOrderForm from './new-order-form'

export default async function NewPrintOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const { sessions } = await getPrintOrderFormData()
  return <NewOrderForm sessions={sessions} preselectedSessionId={session ?? ''} />
}
