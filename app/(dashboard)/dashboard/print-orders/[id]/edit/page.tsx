import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import EditOrderForm from './edit-order-form'

type PrintOrderItem = {
  item_id: string
  product_name: string
  size?: string | null
  quantity: number
  unit_price?: number | string | null
}

export default async function EditPrintOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  type PrintOrderEditRow = {
    order_id: string
    notes: string | null
    status: string | null
    print_order_items: PrintOrderItem[] | null
  }

  const { data: orderRaw } = await context.admin
    .from('print_orders')
    .select('order_id, notes, status, print_order_items(*)')
    .eq('order_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!orderRaw) redirect('/dashboard/print-orders')

  const order = orderRaw as unknown as PrintOrderEditRow

  const items = (order.print_order_items ?? []).map(i => ({
    product_name: i.product_name,
    size:         i.size         ?? '',
    quantity:     String(i.quantity),
    unit_price:   String(i.unit_price ?? ''),
  }))

  return (
    <EditOrderForm
      orderId={id}
      initialNotes={order.notes ?? ''}
      initialItems={items}
    />
  )
}
