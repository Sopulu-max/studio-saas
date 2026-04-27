import Link from 'next/link'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'

type InvoiceListRow = {
  invoice_id: string
  total?: number | string | null
  due_date?: string | null
  status: string
  bookings?: { booking_id?: string | null; booking_ref?: number | null; session_date?: string | null; session_type?: string | null; clients?: { full_name?: string | null } | null } | null
}

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#f1efe8', color: '#5f5e5a' },
  sent:      { bg: '#e6f1fb', color: '#185fa5' },
  paid:      { bg: '#eaf3de', color: '#3b6d11' },
  overdue:   { bg: '#fcebeb', color: '#a32d2d' },
  cancelled: { bg: '#f1efe8', color: '#5f5e5a' },
}

function pageUrl(base: string, params: Record<string, string | undefined>, page: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', page.toString())
  return `${base}?${p}`
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // Summary totals (unfiltered, unpaginated)
  const { data: allInvoicesRaw } = await context.admin
    .from('invoices')
    .select('total, status, bookings!inner(studio_id)')
    .eq('bookings.studio_id', context.studioId)
  const allInvoices = allInvoicesRaw as unknown as { total: number | string | null; status: string }[] | null

  const totalInvoiced  = allInvoices?.reduce((sum, i) => sum + Number(i.total), 0) ?? 0
  const totalPaid      = allInvoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.total), 0) ?? 0
  const totalOutstanding = totalInvoiced - totalPaid

  if (!allInvoices?.length) {
    return renderPage([], 0, pageNum, status, totalInvoiced, totalPaid, totalOutstanding)
  }

  let query = context.admin
    .from('invoices')
    .select('*, bookings!inner(booking_id, booking_ref, session_date, session_type, clients(full_name), studio_id)', { count: 'exact' })
    .eq('bookings.studio_id', context.studioId)

  if (status) query = query.eq('status', status)

  const { data: invoicesRaw, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)
  const invoices = (invoicesRaw ?? []) as unknown as InvoiceListRow[]

  return renderPage(invoices, count ?? 0, pageNum, status, totalInvoiced, totalPaid, totalOutstanding)
}

function renderPage(
  invoices: InvoiceListRow[],
  total: number,
  page: number,
  status: string,
  totalInvoiced: number,
  totalPaid: number,
  totalOutstanding: number,
) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const params = { status }
  const prevUrl = page > 1 ? pageUrl('/dashboard/invoices', params, page - 1) : undefined
  const nextUrl = page < totalPages ? pageUrl('/dashboard/invoices', params, page + 1) : undefined

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Invoices</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{total} result{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/invoices/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          New invoice
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total invoiced', value: totalInvoiced },
          { label: 'Total paid',     value: totalPaid },
          { label: 'Outstanding',    value: totalOutstanding },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 6px' }}>{stat.label}</p>
            <p style={{ fontSize: '20px', fontWeight: '500', margin: 0 }}>₦{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <FilterSelect
          name="status"
          defaultValue={status}
          placeholder="All statuses"
          options={[
            { value: 'draft',     label: 'Draft' },
            { value: 'sent',      label: 'Sent' },
            { value: 'paid',      label: 'Paid' },
            { value: 'overdue',   label: 'Overdue' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </div>

      {!invoices.length ? (
        <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{status ? 'No invoices match your filter' : 'No invoices yet'}</p>
          <p style={{ fontSize: '13px', margin: 0 }}>{status ? 'Try a different status filter' : 'Create your first invoice from a booking'}</p>
        </div>
      ) : (
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
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>
                    {inv.bookings?.clients?.full_name ?? '—'}
                  </p>
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
          <Pagination page={page} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
        </div>
      )}
    </div>
  )
}
