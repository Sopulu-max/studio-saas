import Link from 'next/link'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'

type ContractListRow = {
  contract_id: string
  created_at?: string | null
  signed_by?: string | null
  status: string
  bookings?: { booking_id?: string | null; booking_ref?: number | null; session_date?: string | null; session_type?: string | null; clients?: { full_name?: string | null } | null } | null
}

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:  { bg: '#f1efe8', color: '#5f5e5a' },
  sent:   { bg: '#e6f1fb', color: '#185fa5' },
  signed: { bg: '#eaf3de', color: '#3b6d11' },
  void:   { bg: '#fcebeb', color: '#a32d2d' },
}

function pageUrl(base: string, params: Record<string, string | undefined>, page: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', page.toString())
  return `${base}?${p}`
}

export default async function ContractsPage({
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

  // Summary counts (unfiltered)
  const { data: allContracts } = await context.admin
    .from('contracts')
    .select('status, bookings!inner(studio_id)')
    .eq('bookings.studio_id', context.studioId)

  const signedCount  = allContracts?.filter(c => c.status === 'signed').length ?? 0
  const pendingCount = allContracts?.filter(c => c.status === 'sent').length ?? 0

  if (!allContracts?.length) {
    return renderPage([], 0, pageNum, status, allContracts?.length ?? 0, signedCount, pendingCount)
  }

  let query = context.admin
    .from('contracts')
    .select('*, bookings!inner(booking_id, booking_ref, session_date, session_type, clients(full_name), studio_id)', { count: 'exact' })
    .eq('bookings.studio_id', context.studioId)

  if (status) query = query.eq('status', status)

  const { data: contracts, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  return renderPage(contracts ?? [], count ?? 0, pageNum, status, allContracts?.length ?? 0, signedCount, pendingCount)
}

function renderPage(
  contracts: ContractListRow[],
  total: number,
  page: number,
  status: string,
  allTotal: number,
  signedCount: number,
  pendingCount: number,
) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const params = { status }
  const prevUrl = page > 1 ? pageUrl('/dashboard/contracts', params, page - 1) : undefined
  const nextUrl = page < totalPages ? pageUrl('/dashboard/contracts', params, page + 1) : undefined

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Contracts</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{total} result{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/contracts/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          New contract
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total',   value: allTotal,      color: 'var(--text)' },
          { label: 'Signed',  value: signedCount,   color: '#3b6d11' },
          { label: 'Pending', value: pendingCount,  color: '#854f0b' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 6px' }}>{stat.label}</p>
            <p style={{ fontSize: '28px', fontWeight: '500', margin: 0, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <FilterSelect
          name="status"
          defaultValue={status}
          placeholder="All statuses"
          options={[
            { value: 'draft',  label: 'Draft' },
            { value: 'sent',   label: 'Sent' },
            { value: 'signed', label: 'Signed' },
            { value: 'void',   label: 'Void' },
          ]}
        />
      </div>

      {!contracts.length ? (
        <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{status ? 'No contracts match your filter' : 'No contracts yet'}</p>
          <p style={{ fontSize: '13px', margin: 0 }}>{status ? 'Try a different status filter' : 'Create a contract for a booking to get client sign-off'}</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
            <span>Session</span><span>Date</span><span>Signed by</span><span>Status</span>
          </div>
          {contracts.map((c, i) => {
            const s = STATUS_COLORS[c.status] ?? STATUS_COLORS.draft
            return (
              <Link key={c.contract_id} href={`/dashboard/contracts/${c.contract_id}`} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                borderBottom: i < contracts.length - 1 ? '1px solid var(--line-inner)' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', fontFamily: 'monospace' }}>
                    {sessionName(c.bookings?.clients?.full_name, c.bookings?.booking_ref, c.bookings?.booking_id, c.bookings?.session_date)}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>{c.bookings?.clients?.full_name ?? '—'}</p>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{c.signed_by ?? '—'}</p>
                <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500' }}>
                  {c.status}
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
