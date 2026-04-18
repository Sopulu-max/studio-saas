import { redirect } from 'next/navigation'
import OrderActions from './order-actions'
import Link from 'next/link'
import { getStudioContext } from '@/lib/studio'

type PrintOrderItem = {
  item_id: string
  product_name: string
  size?: string | null
  quantity: number
  unit_price?: number | string | null
}

type PrintOrderBooking = {
  booking_id?: string | null
  session_date?: string | null
  clients?: { full_name?: string | null; phone?: string | null; email?: string | null } | null
  packages?: { name?: string | null } | null
} | null

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#faeeda', color: '#854f0b' },
  printing:  { bg: '#eeedfe', color: '#534ab7' },
  ready:     { bg: '#e6f1fb', color: '#185fa5' },
  collected: { bg: '#eaf3de', color: '#3b6d11' },
  cancelled: { bg: '#fcebeb', color: '#a32d2d' },
}

export default async function PrintOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: order } = await context.admin
    .from('print_orders')
    .select(`
      *,
      bookings ( booking_id, session_date, studio_id, clients ( full_name, phone, email ), packages ( name ) ),
      print_order_items ( * )
    `)
    .eq('order_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!order) redirect('/dashboard/print-orders')

  const items   = (order.print_order_items as PrintOrderItem[]) ?? []
  const booking = order.bookings as PrintOrderBooking
  const total   = items.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0)
  const s       = STATUS_COLORS[order.status ?? ''] ?? STATUS_COLORS.pending

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Print order</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            {booking?.clients?.full_name ?? 'No session linked'}
            {booking?.packages?.name ? ` · ${booking.packages.name}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500', textTransform: 'capitalize' }}>
            {order.status}
          </span>
          {order.status !== 'collected' && order.status !== 'cancelled' && (
            <Link
              href={`/dashboard/print-orders/${id}/edit`}
              style={{ fontSize: '13px', padding: '5px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)' }}
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Client & session */}
      {booking && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>CLIENT</p>
          <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>{booking.clients?.full_name}</p>
          {booking.clients?.phone && (
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 2px' }}>{booking.clients.phone}</p>
          )}
          {booking.clients?.email && (
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 10px' }}>{booking.clients.email}</p>
          )}
          {booking.session_date && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>Session:</span>
              <Link href={`/dashboard/sessions/${booking.booking_id}`}
                style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
                {new Date(booking.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })} →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Order items */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 16px' }}>ITEMS</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              {['Product', 'Size', 'Qty', 'Unit price', 'Subtotal'].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 2 ? 'right' : 'left', fontSize: '11px', color: 'var(--text-4)', fontWeight: '500', borderBottom: '1px solid var(--line)', padding: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.item_id}>
                <td style={{ padding: '10px 0', borderBottom: '1px solid var(--line-inner)', fontWeight: '500' }}>{item.product_name}</td>
                <td style={{ padding: '10px 0', borderBottom: '1px solid var(--line-inner)', color: 'var(--text-3)' }}>{item.size || '—'}</td>
                <td style={{ padding: '10px 0', borderBottom: '1px solid var(--line-inner)', textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ padding: '10px 0', borderBottom: '1px solid var(--line-inner)', textAlign: 'right', color: 'var(--text-3)' }}>₦{Number(item.unit_price).toLocaleString()}</td>
                <td style={{ padding: '10px 0', borderBottom: '1px solid var(--line-inner)', textAlign: 'right', fontWeight: '500' }}>₦{(Number(item.unit_price) * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
          <div style={{ textAlign: 'right' as const }}>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Order total</p>
            <p style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>₦{total.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 8px' }}>NOTES</p>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: '1.6' }}>{order.notes}</p>
        </div>
      )}

      <OrderActions orderId={id} currentStatus={order.status} />
    </div>
  )
}
