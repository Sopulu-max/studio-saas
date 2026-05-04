import Link from 'next/link'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'

const PAGE_SIZE = 20

type InvoiceListRow = {
  invoice_id:  string
  total?:      number | string | null
  due_date?:   string | null
  status:      string
  bookings?: {
    booking_id?:   string | null
    booking_ref?:  number | null
    session_date?: string | null
    session_type?: string | null
    clients?: { full_name?: string | null } | null
  } | null
}

type PaymentRow = {
  payment_id:   string
  invoice_id:   string
  amount?:      number | string | null
  paid_at?:     string | null
  method?:      string | null
  reference?:   string | null
  bookings?: {
    booking_id?:   string | null
    booking_ref?:  number | null
    session_date?: string | null
    clients?: { full_name?: string | null } | null
  } | null
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#f1efe8', color: '#5f5e5a' },
  sent:      { bg: '#e6f1fb', color: '#185fa5' },
  paid:      { bg: '#eaf3de', color: '#3b6d11' },
  overdue:   { bg: '#fcebeb', color: '#a32d2d' },
  cancelled: { bg: '#f1efe8', color: '#5f5e5a' },
}

function tabUrl(viewKey: string) {
  return `/dashboard/invoices?view=${viewKey}`
}

function pageUrl(view: string, params: Record<string, string>, pg: number) {
  const p = new URLSearchParams({ view, ...params, page: String(pg) })
  return `/dashboard/invoices?${p}`
}

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'all',         label: 'All' },
    { key: 'outstanding', label: 'Outstanding' },
    { key: 'payments',    label: 'Payments log' },
  ]
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '1.25rem', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '3px', width: 'fit-content' }}>
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

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string; method?: string; page?: string }>
}) {
  const { view = 'all', status = '', method = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // ── Stats (always — full-table aggregates) ─────────────────────
  const { data: allInvoicesRaw } = await context.admin
    .from('invoices')
    .select('invoice_id, total, status, bookings!inner(studio_id)')
    .eq('bookings.studio_id', context.studioId)
  const allInvoices = (allInvoicesRaw ?? []) as unknown as { invoice_id: string; total: number | string | null; status: string }[]

  // We need to know payments to get true outstanding/overdue balances
  const allInvoiceIds = allInvoices.map(i => i.invoice_id)
  const { data: allPaymentsRaw } = allInvoiceIds.length > 0
    ? await context.admin.from('payments').select('invoice_id, amount').in('invoice_id', allInvoiceIds)
    : { data: [] }
  const allPayments = (allPaymentsRaw ?? []) as unknown as { invoice_id: string; amount: number | string | null }[]

  const paidMap: Record<string, number> = {}
  for (const p of allPayments) {
    paidMap[p.invoice_id] = (paidMap[p.invoice_id] ?? 0) + Number(p.amount)
  }

  function balance(inv: { invoice_id: string; total: number | string | null | undefined }) {
    return Math.max(0, Number(inv.total ?? 0) - (paidMap[inv.invoice_id] ?? 0))
  }

  const totalInvoiced   = allInvoices.reduce((s, i) => s + Number(i.total ?? 0), 0)
  const totalPaid       = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total ?? 0), 0)
  const totalOutstanding = allInvoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((s, i) => s + balance(i), 0)
  const totalOverdue     = allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + balance(i), 0)

  // ── View data ──────────────────────────────────────────────────
  let invoices: InvoiceListRow[] = []
  let invoiceTotal = 0
  let outstandingInvoices: Array<InvoiceListRow & { _balance: number; _daysOverdue?: number }> = []
  let payments: PaymentRow[] = []
  let paymentTotal = 0

  if (view === 'all') {
    if (allInvoices.length > 0) {
      const from = (pageNum - 1) * PAGE_SIZE
      const to   = from + PAGE_SIZE - 1

      let q = context.admin
        .from('invoices')
        .select('*, bookings!inner(booking_id, booking_ref, session_date, session_type, clients(full_name), studio_id)', { count: 'exact' })
        .eq('bookings.studio_id', context.studioId)

      if (status) q = q.eq('status', status)
      const { data, count } = await q.order('created_at', { ascending: false }).range(from, to)
      invoices      = (data ?? []) as unknown as InvoiceListRow[]
      invoiceTotal  = count ?? 0
    }
  }

  if (view === 'outstanding') {
    // Sent + overdue invoices, sorted by due_date asc (most urgent first)
    const { data } = await context.admin
      .from('invoices')
      .select('*, bookings!inner(booking_id, booking_ref, session_date, session_type, clients(full_name), studio_id)')
      .eq('bookings.studio_id', context.studioId)
      .in('status', ['sent', 'overdue'])
      .order('due_date', { ascending: true })
    const raw = (data ?? []) as unknown as InvoiceListRow[]

    outstandingInvoices = raw
      .map(inv => ({
        ...inv,
        _balance: balance({ invoice_id: inv.invoice_id, total: inv.total }),
        _daysOverdue: inv.due_date
          ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86_400_000))
          : undefined,
      }))
      .filter(inv => inv._balance > 0)
      .sort((a, b) => (a._daysOverdue ?? -1) - (b._daysOverdue ?? -1) || 0)
  }

  if (view === 'payments') {
    const from = (pageNum - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    // We need payment_id, amount, paid_at, method, reference, and the invoice's booking info
    // Approach: join payments → invoices → bookings
    // Since payments has invoice_id, and invoices has booking_id, do a multi-step join
    if (allInvoiceIds.length > 0) {
      let q = context.admin
        .from('payments')
        .select('*, invoices!inner(booking_id, bookings!inner(booking_id, booking_ref, session_date, studio_id, clients(full_name)))', { count: 'exact' })
        .eq('invoices.bookings.studio_id', context.studioId)

      if (method) q = q.eq('method', method)
      const { data, count } = await q.order('paid_at', { ascending: false }).range(from, to)
      payments     = (data ?? []) as unknown as PaymentRow[]
      paymentTotal = count ?? 0
    }
  }

  // Distinct payment methods for filter
  const { data: methodRows } = view === 'payments'
    ? await context.admin.from('payments').select('method').in('invoice_id', allInvoiceIds.slice(0, 1000))
    : { data: null }
  const distinctMethods = [...new Set((methodRows ?? []).map((r: { method?: string | null }) => r.method).filter(Boolean) as string[])].sort()

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>Invoices</h1>
        <Link href="/dashboard/invoices/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          New invoice
        </Link>
      </div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total invoiced', value: `₦${totalInvoiced.toLocaleString()}` },
          { label: 'Collected',      value: `₦${totalPaid.toLocaleString()}` },
          { label: 'Outstanding',    value: `₦${totalOutstanding.toLocaleString()}`, highlight: totalOutstanding > 0 },
          { label: 'Overdue',        value: `₦${totalOverdue.toLocaleString()}`,    highlight: totalOverdue > 0 },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: `1px solid ${s.highlight ? '#e5c98a' : 'var(--line)'}`, borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px', fontWeight: '600' }}>{s.label}</p>
            <p style={{ fontSize: '20px', fontWeight: '500', margin: 0, color: s.highlight ? '#854f0b' : 'var(--text)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tab nav ─────────────────────────────────────────── */}
      <TabNav active={view} />

      {/* ══════════════════════════════════════════════════════
          VIEW: ALL
          ══════════════════════════════════════════════════════ */}
      {view === 'all' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            <FilterSelect name="status" defaultValue={status} placeholder="All statuses"
              options={['draft','sent','paid','overdue','cancelled'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 12px' }}>
            {invoiceTotal} result{invoiceTotal !== 1 ? 's' : ''}
          </p>
          {!invoices.length ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{status ? 'No invoices match your filter' : 'No invoices yet'}</p>
              <p style={{ fontSize: '13px', margin: 0 }}>{status ? 'Try a different status' : 'Create your first invoice from a booking'}</p>
            </div>
          ) : (
            <>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                  <span>Session</span><span>Total</span><span>Due date</span><span>Status</span>
                </div>
                {invoices.map((inv, i) => {
                  const s = STATUS_COLORS[inv.status] ?? STATUS_COLORS.draft
                  return (
                    <Link key={inv.invoice_id} href={`/dashboard/invoices/${inv.invoice_id}`} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                      borderBottom: i < invoices.length - 1 ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>{inv.bookings?.clients?.full_name ?? '—'}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                          {sessionName(inv.bookings?.clients?.full_name, inv.bookings?.booking_ref, inv.bookings?.booking_id, inv.bookings?.session_date)}
                        </p>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>₦{Number(inv.total).toLocaleString()}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}
                      </p>
                      <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500' }}>
                        {inv.status}
                      </span>
                    </Link>
                  )
                })}
              </div>
              <Pagination
                page={pageNum}
                totalPages={Math.ceil(invoiceTotal / PAGE_SIZE)}
                prevUrl={pageNum > 1 ? pageUrl('all', { status }, pageNum - 1) : undefined}
                nextUrl={pageNum < Math.ceil(invoiceTotal / PAGE_SIZE) ? pageUrl('all', { status }, pageNum + 1) : undefined}
              />
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: OUTSTANDING
          ══════════════════════════════════════════════════════ */}
      {view === 'outstanding' && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            Sent + overdue invoices with remaining balance — sorted by due date
          </p>
          {outstandingInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>✓ Nothing outstanding</p>
              <p style={{ fontSize: '13px', margin: 0 }}>All sent invoices have been settled</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 90px', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', letterSpacing: '0.04em' }}>
                <span>SESSION</span><span>INVOICE</span><span>BALANCE DUE</span><span>DUE DATE</span><span>STATUS</span>
              </div>
              {outstandingInvoices.map((inv, i) => {
                const s = STATUS_COLORS[inv.status] ?? STATUS_COLORS.sent
                const isOverdue = inv._daysOverdue !== undefined && inv._daysOverdue > 0
                return (
                  <Link key={inv.invoice_id} href={`/dashboard/invoices/${inv.invoice_id}`} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 90px',
                    padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                    borderBottom: i < outstandingInvoices.length - 1 ? '1px solid var(--line-inner)' : 'none',
                  }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>{inv.bookings?.clients?.full_name ?? '—'}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {sessionName(inv.bookings?.clients?.full_name, inv.bookings?.booking_ref, inv.bookings?.booking_id, inv.bookings?.session_date)}
                      </p>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>₦{Number(inv.total ?? 0).toLocaleString()}</p>
                    <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: isOverdue ? '#a32d2d' : 'var(--text)' }}>
                      ₦{inv._balance.toLocaleString()}
                    </p>
                    <div>
                      <p style={{ fontSize: '13px', margin: '0 0 2px', color: isOverdue ? '#a32d2d' : 'var(--text-3)' }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                      {isOverdue && (
                        <p style={{ fontSize: '11px', color: '#a32d2d', margin: 0, fontWeight: '500' }}>
                          {inv._daysOverdue}d overdue
                        </p>
                      )}
                    </div>
                    <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500' }}>
                      {inv.status}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: PAYMENTS LOG
          ══════════════════════════════════════════════════════ */}
      {view === 'payments' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            {distinctMethods.length > 0 && (
              <FilterSelect name="method" defaultValue={method} placeholder="All methods"
                options={distinctMethods.map(m => ({ value: m, label: m }))} />
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 12px' }}>
            {paymentTotal} payment{paymentTotal !== 1 ? 's' : ''} recorded
          </p>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>No payments recorded yet</p>
              <p style={{ fontSize: '13px', margin: 0 }}>Payments are recorded from the invoice detail page</p>
            </div>
          ) : (
            <>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 2fr 1fr 100px 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', letterSpacing: '0.04em' }}>
                  <span>DATE</span><span>CLIENT · SESSION</span><span>AMOUNT</span><span>METHOD</span><span>REFERENCE</span>
                </div>
                {payments.map((p, i) => {
                  const bk = (p as { invoices?: { bookings?: { booking_id?: string | null; booking_ref?: number | null; session_date?: string | null; clients?: { full_name?: string | null } | null } | null } | null }).invoices?.bookings
                  return (
                    <div key={p.payment_id} style={{
                      display: 'grid', gridTemplateColumns: '120px 2fr 1fr 100px 1fr',
                      padding: '1rem 1.25rem', alignItems: 'center',
                      borderBottom: i < payments.length - 1 ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>{bk?.clients?.full_name ?? '—'}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.01em' }}>
                          {sessionName(bk?.clients?.full_name, bk?.booking_ref, bk?.booking_id, bk?.session_date)}
                        </p>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#3b6d11' }}>
                        ₦{Number(p.amount ?? 0).toLocaleString()}
                      </p>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', background: 'var(--active)', color: 'var(--text-3)', fontWeight: '500', textTransform: 'capitalize', width: 'fit-content' }}>
                        {p.method ?? '—'}
                      </span>
                      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace' }}>
                        {p.reference ?? '—'}
                      </p>
                    </div>
                  )
                })}
              </div>
              <Pagination
                page={pageNum}
                totalPages={Math.ceil(paymentTotal / PAGE_SIZE)}
                prevUrl={pageNum > 1 ? pageUrl('payments', { method }, pageNum - 1) : undefined}
                nextUrl={pageNum < Math.ceil(paymentTotal / PAGE_SIZE) ? pageUrl('payments', { method }, pageNum + 1) : undefined}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
