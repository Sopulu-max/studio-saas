import { getInvoiceFormData } from '@/app/actions/invoices'
import NewInvoiceForm from './new-invoice-form'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const { bookings, packages } = await getInvoiceFormData(session)
  return <NewInvoiceForm bookings={bookings} packages={packages} preselectedSessionId={session ?? ''} />
}
