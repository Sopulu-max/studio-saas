import Link from 'next/link'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'
import { unwrapRow } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type PrintOrderItem = {
  quantity:   number
  unit_price?: number | string | null
}

type PrintOrderBooking = {
  booking_id?:   string | null
  booking_ref?:  number | null
  session_date?: string | null
  session_type?: string | null
  clients?: { full_name?: string | null } | null
} | null

type PrintOrderRow = {
  order_id:     string
  status?:      string | null
  created_at:   string
  notes?:       string | null
  bookings:     PrintOrderBooking
  print_order_items: PrintOrderItem[]
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

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

const ACTIVE_STATUSES = ['pending', 'printing', 'ready']

// ─── Helpers ────────────────────────────────────────────────────────────────

function orderTotal(items: PrintOrderItem[]) {
  return items?.reduce((sum, i) => sum + Number(i.unit_price ?? 0) * i.quantity, 0) ?? 0
}

function pageUrl(params: Record<string, string | undefined>, pg: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', String(pg))
  return `/dashboard/print-orders?${p}`
}

function tabUrl(view: string) {
  return `/dashboard/print-orders?view=${view}`
}

function sDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component helpers ──────────────────────────────────────────────────────

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'all',     label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'revenue', label: 'Revenue' },
  ]
  return (
    <div className="glass-panel" style={{ display: 'flex', gap: '2px', marginBottom: '1.25rem', padding: '3px', width: 'fit-content' }}>
      {tabs.map(t => (
        <Link key={t.key} href={tabUrl(t.key)} style={{
          padding: '6px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: '500',
          textDecoration: 'none', whiteSpace: 'nowrap',
          background: active === t.key ? 'var(--btn)' : 'transparent',
          color: active === t.key ? 'var(--btn-fg)' : 'var(--text-3)',
        }}>{t.label}</Link>
      ))}
    </div>
  )
}

function StatsStrip({ items }: { items: { label: string; value: string | number; accent?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '12px', marginBottom: '1.5rem' }}>
      {items.map(item => (
        <div key={item.label} className="glass-panel" style={{ padding: '1.1rem 1.25rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px', fontWeight: '500' }}>{item.label}</p>
          <p style={{ fontSize: '26px', fontWeight: '500', margin: 0, color: item.accent ?? 'var(--text)', lineHeight: 1.1 }}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
      <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{message}</p>
      <p style={{ fontSize: '13px', margin: 0 }}>{sub}</p>
    </div>
  )
}

// Shared order row renderer
function OrderRow({ o, i, isLast }: { o: PrintOrderRow; i: number; isLast: boolean }) {
  const st      = STATUS_COLORS[o.status ?? ''] ?? STATUS_COLORS.pending
  const items   = o.print_order_items ?? []
  const total   = orderTotal(items)
  const booking = o.bookings
  return (
    <Link key={o.order_id} href={`/dashboard/print-orders/${o.order_id}`} className="hover-lift" style={{
      display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr',
      padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
      borderBottom: !isLast ? '1px solid var(--line-inner)' : 'none',
    }}>
      <div>
        <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {unwrapRow(booking?.clients)?.full_name ?? 'No session linked'}
        </p>
        {booking && (
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
            {sessionName(unwrapRow(booking.clients)?.full_name, booking.booking_ref, booking.booking_id, booking.session_date)}
          </p>
        )}
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{sDate(o.created_at)}</p>
      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
      <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>₦{total.toLocaleString()}</p>
      <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: st.bg, color: st.color, fontWeight: '500' }}>
        {STATUS_LABELS[o.status ?? ''] ?? o.status}
      </span>
    </Link>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function PrintOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string; page?: string }>
}) {
  const { view = 'all', status = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from    = (pageNum - 1) * PAGE_SIZE
  const to      = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // ── Stats (always) ───────────────────────────────────────────────
  const { data: allOrdersRaw } = await context.admin
    .from('print_orders')
    .select('order_id, status, print_order_items(quantity, unit_price)')
    .eq('studio_id', context.studioId)

  type MinOrder = { order_id: string; status?: string | null; print_order_items?: PrintOrderItem[] | null }
  const allOrders = (allOrdersRaw ?? []) as unknown as MinOrder[]

  const totalOrders    = allOrders.length
  const activeOrders   = allOrders.filter(o => ACTIVE_STATUSES.includes(o.status ?? '')).length
  const collectedOrders = allOrders.filter(o => o.status === 'collected').length
  const totalRevenue   = allOrders
    .filter(o => o.status === 'collected')
    .reduce((s, o) => s + orderTotal(o.print_order_items ?? []), 0)

  const statsItems = [
    { label: 'Total orders',    value: totalOrders },
    { label: 'Active',          value: activeOrders,    accent: '#854f0b' },
    { label: 'Collected',       value: collectedOrders, accent: '#3b6d11' },
    { label: 'Revenue collected', value: `₦${totalRevenue.toLocaleString()}` },
  ]

  // ── Header ───────────────────────────────────────────────────────
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>Print orders</h1>
      <Link href="/dashboard/print-orders/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
        New order
      </Link>
    </div>
  )

  // ── Pending view (active orders) ─────────────────────────────────
  if (view === 'pending') {
    const { data: raw } = await context.admin
      .from('print_orders')
      .select(`order_id, status, created_at, notes, bookings(booking_id, booking_ref, session_date, session_type, clients(full_name)), print_order_items(quantity, unit_price)`)
      .eq('studio_id', context.studioId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true })
      .limit(200)
    const orders = (raw ?? []) as unknown as PrintOrderRow[]

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="pending" />

        {!orders.length ? (
          <EmptyState message="No active orders" sub="All print orders have been collected or cancelled" />
        ) : (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
              <span>Session</span><span>Ordered</span><span>Items</span><span>Total</span><span>Status</span>
            </div>
            <AnimatedList>
              {orders.map((o, i) => (
                <AnimatedItem key={o.order_id} delay={i * 0.05}>
                  <OrderRow o={o} i={i} isLast={i === orders.length - 1} />
                </AnimatedItem>
              ))}
            </AnimatedList>
          </div>
        )}
      </div>
    )
  }

  // ── Revenue view ─────────────────────────────────────────────────
  if (view === 'revenue') {
    // Group all collected orders by month
    const { data: raw } = await context.admin
      .from('print_orders')
      .select(`order_id, status, created_at, notes, bookings(booking_id, booking_ref, session_date, session_type, clients(full_name)), print_order_items(quantity, unit_price)`)
      .eq('studio_id', context.studioId)
      .eq('status', 'collected')
      .order('created_at', { ascending: false })
      .limit(500)
    const orders = (raw ?? []) as unknown as PrintOrderRow[]

    // Group by YYYY-MM
    const monthGroups: Record<string, { orders: PrintOrderRow[]; total: number }> = {}
    for (const o of orders) {
      if (!o.created_at) continue
      const month = o.created_at.slice(0, 7)
      if (!monthGroups[month]) monthGroups[month] = { orders: [], total: 0 }
      const t = orderTotal(o.print_order_items ?? [])
      monthGroups[month].orders.push(o)
      monthGroups[month].total += t
    }
    const months = Object.keys(monthGroups).sort().reverse()

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="revenue" />

        {!orders.length ? (
          <EmptyState message="No collected orders yet" sub="Revenue will appear here once print orders are collected" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {months.map(month => {
              const group     = monthGroups[month]
              const monthDate = new Date(`${month}-01T00:00:00`)
              const label     = monthDate.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
              return (
                <div key={month}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '10px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                      {group.orders.length} order{group.orders.length !== 1 ? 's' : ''} · ₦{group.total.toLocaleString()}
                    </p>
                  </div>
                  <div className="glass-panel" style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                      <span>Session</span><span>Date</span><span>Items</span><span>Total</span><span>Status</span>
                    </div>
                    <AnimatedList>
                      {group.orders.map((o, i) => (
                        <AnimatedItem key={o.order_id} delay={i * 0.05}>
                          <OrderRow o={o} i={i} isLast={i === group.orders.length - 1} />
                        </AnimatedItem>
                      ))}
                    </AnimatedList>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── All view (default) ───────────────────────────────────────────
  let query = context.admin
    .from('print_orders')
    .select(`order_id, status, created_at, notes, bookings(booking_id, booking_ref, session_date, session_type, clients(full_name)), print_order_items(quantity, unit_price)`, { count: 'exact' })
    .eq('studio_id', context.studioId)

  if (status) query = query.eq('status', status)

  const { data: ordersRaw, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)
  const orders     = (ordersRaw ?? []) as unknown as PrintOrderRow[]
  const listTotal  = count ?? 0
  const totalPages = Math.ceil(listTotal / PAGE_SIZE)
  const prevUrl    = pageNum > 1          ? pageUrl({ view: 'all', status }, pageNum - 1) : undefined
  const nextUrl    = pageNum < totalPages ? pageUrl({ view: 'all', status }, pageNum + 1) : undefined

  return (
    <div>
      {header}
      <StatsStrip items={statsItems} />
      <TabNav active="all" />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <FilterSelect
          name="status"
          defaultValue={status}
          placeholder="All statuses"
          options={[
            { value: 'pending',   label: 'Pending' },
            { value: 'printing',  label: 'Printing' },
            { value: 'ready',     label: 'Ready' },
            { value: 'collected', label: 'Collected' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
        {listTotal} order{listTotal !== 1 ? 's' : ''}
      </p>

      {!orders.length ? (
        <EmptyState
          message={status ? 'No orders match your filter' : 'No print orders yet'}
          sub={status ? 'Try a different status filter' : 'Create your first order to track prints, albums, and canvases'}
        />
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
            <span>Session</span><span>Date</span><span>Items</span><span>Total</span><span>Status</span>
          </div>
          <AnimatedList>
            {orders.map((o, i) => (
              <AnimatedItem key={o.order_id} delay={i * 0.05}>
                <OrderRow o={o} i={i} isLast={i === orders.length - 1} />
              </AnimatedItem>
            ))}
          </AnimatedList>
          <Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
        </div>
      )}
    </div>
  )
}
