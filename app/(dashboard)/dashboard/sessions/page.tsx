import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import DateRangeFilter from '@/components/date-range-filter'
import Pagination from '@/components/pagination'
import BulkSessionList from './bulk-session-list'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'

type SessionRow = {
  booking_id: string
  session_type?: string | null
  session_date?: string | null
  status: string
  clients?: { full_name?: string | null; email?: string | null } | null
  packages?: { name?: string | null } | null
}

const PAGE_SIZE = 20

function pageUrl(base: string, params: Record<string, string | undefined>, page: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', page.toString())
  return `${base}?${p}`
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; date_from?: string; date_to?: string; page?: string }>
}) {
  const { q = '', status = '', type = '', date_from = '', date_to = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: studioRow } = await context.admin
    .from('studios')
    .select('session_types, service_types, booking_statuses')
    .eq('studio_id', context.studioId)
    .single()

  const config = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  // Resolve client name search to IDs first
  let clientIds: string[] | null = null
  if (q) {
    const { data: matched } = await context.admin
      .from('clients')
      .select('client_id')
      .eq('studio_id', context.studioId)
      .ilike('full_name', `%${q}%`)
    clientIds = matched?.map(c => c.client_id) ?? []
  }

  // Pending requests count (always unfiltered)
  const pendingStatus = config.bookingStatuses.find(s => s.order === 0)?.value ?? 'pending_confirmation'
  const { count: pendingCount } = await context.admin
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('studio_id', context.studioId)
    .eq('status', pendingStatus)

  let query = context.admin
    .from('bookings')
    .select('*, clients(full_name, email), packages(name)', { count: 'exact' })
    .eq('studio_id', context.studioId)

  if (status)    query = query.eq('status', status)
  if (type)      query = query.eq('session_type', type)
  if (date_from) query = query.gte('session_date', date_from)
  if (date_to)   query = query.lte('session_date', date_to + 'T23:59:59')
  if (clientIds !== null) {
    if (clientIds.length === 0) return renderPage([], 0, pageNum, q, status, type, date_from, date_to, pendingCount ?? 0, pendingStatus, config)
    query = query.in('client_id', clientIds)
  }

  const { data: sessions, count } = await query
    .order('session_date', { ascending: false })
    .range(from, to)

  return renderPage(sessions ?? [], count ?? 0, pageNum, q, status, type, date_from, date_to, pendingCount ?? 0, pendingStatus, config)
}

function renderPage(
  sessions: SessionRow[],
  total: number,
  page: number,
  q: string,
  status: string,
  type: string,
  date_from: string,
  date_to: string,
  pendingCount: number,
  pendingStatus: string,
  config: ReturnType<typeof buildStudioConfig>,
) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const params  = { q, status, type, date_from, date_to }
  const prevUrl = page > 1          ? pageUrl('/dashboard/sessions', params, page - 1) : undefined
  const nextUrl = page < totalPages ? pageUrl('/dashboard/sessions', params, page + 1) : undefined

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Sessions</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{total} result{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/sessions/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          New session
        </Link>
      </div>

      {pendingCount > 0 && status !== pendingStatus && (
        <Link
          href={`/dashboard/sessions?status=${pendingStatus}`}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faeeda', border: '0.5px solid #e5c98a', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', textDecoration: 'none', color: '#854f0b' }}
        >
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            🔔 {pendingCount} pending booking request{pendingCount !== 1 ? 's' : ''} waiting for review
          </span>
          <span style={{ fontSize: '13px' }}>Review →</span>
        </Link>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <SearchInput defaultValue={q} placeholder="Search by client name..." />
        <DateRangeFilter defaultFrom={date_from} defaultTo={date_to} />
        <FilterSelect
          name="type"
          defaultValue={type}
          placeholder="All types"
          options={config.sessionTypes.map(t => ({ value: t.value, label: t.label }))}
        />
        <FilterSelect
          name="status"
          defaultValue={status}
          placeholder="All statuses"
          options={config.bookingStatuses.map(s => ({ value: s.value, label: s.label }))}
        />
      </div>

      {!sessions.length ? (
        <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{q || status || type ? 'No sessions match your filters' : 'No sessions yet'}</p>
          <p style={{ fontSize: '13px', margin: 0 }}>{q || status || type ? 'Try adjusting your search or filters' : 'Create your first session to get started'}</p>
        </div>
      ) : (
        <>
          <BulkSessionList sessions={sessions} />
          <Pagination page={page} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
        </>
      )}
    </div>
  )
}
