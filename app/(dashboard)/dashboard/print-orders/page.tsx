import Link from 'next/link'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'

type PrintOrderItem = {
  quantity: number
  unit_price?: number | string | null
}

type PrintOrderBooking = {
  clients?: { full_name?: string | null } | null
} | null

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#faeeda', color: '#854f0b' },
  printing:  { bg: '#eeedfe', color: '#534ab7' },
  ready:     { bg: '#e6f1fb', color: '#185fa5' },
  collected: { bg: '#eaf3de', color: '#3b6d11' },
  cancelled: { bg: '#fcebeb', color: '#a32d2d' },
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pending',
  printing:  'Printing',
  ready:     'Ready',
  collected: 'Collected',
  cancelled: 'Cancelled',
}

const PAGE_SIZE = 20

export default async function PrintOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: orders, count } = await context.admin
    .from('print_orders')
    .select(`
      order_id, status, created_at, notes,
      bookings ( session_date, clients ( full_name ) ),
      print_order_items ( quantity, unit_price )
    `, { count: 'exact' })
    .eq('studio_id', context.studioId)
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function orderTotal(items: PrintOrderItem[]) {
    return items?.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0) ?? 0
  }

  function pageUrl(p: number) {
    return `/dashboard/print-orders?page=${p}`
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Print orders</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{count ?? 0} order{count !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/print-orders/new"
          style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          New order
        </Link>
      </div>

      {!orders?.length ? (
        <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px' }}>No print orders yet</p>
          <p style={{ fontSize: '13px', margin: 0 }}>Create your first order to track prints, albums, and canvases</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
            <span>Client</span><span>Date</span><span>Items</span><span>Total</span><span>Status</span>
          </div>
          {orders.map((o, i) => {
            const st    = STATUS_COLORS[o.status ?? ''] ?? STATUS_COLORS.pending
            const items = (o.print_order_items as PrintOrderItem[]) ?? []
            const total = orderTotal(items)
            const booking = o.bookings as PrintOrderBooking
            return (
              <Link key={o.order_id} href={`/dashboard/print-orders/${o.order_id}`} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr',
                padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                borderBottom: i < orders.length - 1 ? '1px solid var(--line-inner)' : 'none',
              }}>
                <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
                  {booking?.clients?.full_name ?? 'No session linked'}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                  {new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>
                  ₦{total.toLocaleString()}
                </p>
                <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: st.bg, color: st.color, fontWeight: '500' }}>
                  {STATUS_LABELS[o.status ?? ''] ?? o.status}
                </span>
              </Link>
            )
          })}
          <Pagination
            page={page}
            totalPages={totalPages}
            prevUrl={page > 1 ? pageUrl(page - 1) : undefined}
            nextUrl={page < totalPages ? pageUrl(page + 1) : undefined}
          />
        </div>
      )}
    </div>
  )
}
