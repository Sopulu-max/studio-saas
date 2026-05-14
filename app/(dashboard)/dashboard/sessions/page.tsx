import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import DateRangeFilter from '@/components/date-range-filter'
import Pagination from '@/components/pagination'
import BulkSessionList from './bulk-session-list'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getStatusConfig, getSessionTypeConfig } from '@/lib/studio-config'
import { sessionName } from '@/lib/session-title'
import { ViewSwitcher, resolveLayout } from '@/components/view-switcher'

const PAGE_SIZE = 20

// ─── Types ────────────────────────────────────────────────────────
type SessionListRow = {
  booking_id:    string
  booking_ref?:  number | null
  session_type?: string | null
  shoot_type?:   string | null
  session_date?: string | null
  status:        string
  clients?: { full_name?: string | null; email?: string | null } | null
  packages?: { name?: string | null } | null
}

type StudioConfig = ReturnType<typeof buildStudioConfig>

// ─── URL helpers ─────────────────────────────────────────────────
function tabUrl(viewKey: string) {
  return `/dashboard/sessions?view=${viewKey}`
}

function allPageUrl(params: Record<string, string>, pg: number) {
  const p = new URLSearchParams()
  p.set('view', 'all')
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', String(pg))
  return `/dashboard/sessions?${p}`
}

// ─── Component helpers ────────────────────────────────────────────
function sDate(session_date?: string | null) {
  if (!session_date) return '—'
  return new Date(session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'all',          label: 'All' },
    { key: 'pipeline',     label: 'Pipeline' },
    { key: 'by-category',  label: 'By category' },
    { key: 'needs-action', label: 'Needs action' },
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

// compact row used in pipeline / by-category / needs-action
function CompactRow({ s, right }: { s: SessionListRow; right: React.ReactNode }) {
  return (
    <Link href={`/dashboard/sessions/${s.booking_id}`} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
      padding: '0.75rem 1.25rem', textDecoration: 'none', color: 'inherit',
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {s.clients?.full_name ?? '—'}
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.01em' }}>
          {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
          {s.shoot_type ? ` · ${s.shoot_type}` : ''}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {right}
      </div>
    </Link>
  )
}

function GroupCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
      {children}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────
export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string; q?: string; status?: string; type?: string
    category?: string; date_from?: string; date_to?: string; page?: string; layout?: string
  }>
}) {
  const {
    view = 'all',
    q = '', status = '', type = '', category = '',
    date_from = '', date_to = '', page = '1',
    layout: rawLayout,
  } = await searchParams
  const sessionLayout = view === 'all' ? resolveLayout(rawLayout, ['list', 'grid']) : 'list'
  const pageNum = Math.max(1, parseInt(page) || 1)

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studioRow = await fetchStudio(context.admin, context.studioId)
  const config = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  // ── Status helpers ─────────────────────────────────────────────
  const cancelValues  = config.bookingStatuses.filter(s => s.is_cancellation).map(s => s.value)
  const excludeValues = config.bookingStatuses.filter(s => s.is_cancellation || s.is_terminal).map(s => s.value)
  const activeStatuses = config.bookingStatuses.filter(s => !s.is_cancellation && !s.is_terminal).sort((a, b) => a.order - b.order)
  const intakeStatus  = activeStatuses[0]?.value ?? ''
  const selectionStatuses = config.bookingStatuses.filter(s => s.requires_selection_count).map(s => s.value)

  const cancelIn  = cancelValues.length  ? `(${cancelValues.map(v => `"${v}"`).join(',')})` : '("__none__")'
  const excludeIn = excludeValues.length ? `(${excludeValues.map(v => `"${v}"`).join(',')})` : '("__none__")'

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // ── Stats strip (always, parallel) ────────────────────────────
  const [
    { count: totalSessions },
    { count: thisMonthCount },
    { count: pipelineCount },
    cancelledResult,
  ] = await Promise.all([
    context.admin.from('bookings').select('*', { count: 'exact', head: true })
      .eq('studio_id', context.studioId).not('status', 'in', cancelIn),
    context.admin.from('bookings').select('*', { count: 'exact', head: true })
      .eq('studio_id', context.studioId).gte('session_date', monthStart).not('status', 'in', cancelIn),
    context.admin.from('bookings').select('*', { count: 'exact', head: true })
      .eq('studio_id', context.studioId).not('status', 'in', excludeIn),
    cancelValues.length > 0
      ? context.admin.from('bookings').select('*', { count: 'exact', head: true })
          .eq('studio_id', context.studioId).gte('session_date', monthStart).in('status', cancelValues)
      : Promise.resolve({ count: 0 }),
  ])
  const cancelledThisMonth = cancelledResult.count ?? 0

  // ── "All" view data ────────────────────────────────────────────
  let allSessions: SessionListRow[] = []
  let allTotal = 0
  let pendingCount = 0

  if (view === 'all') {
    let clientIds: string[] | null = null
    if (q) {
      const { data: matched } = await context.admin.from('clients').select('client_id')
        .eq('studio_id', context.studioId).ilike('full_name', `%${q}%`)
      clientIds = (matched as unknown as { client_id: string }[])?.map(c => c.client_id) ?? []
    }

    // Get distinct shoot_types for the category filter dropdown
    const from = (pageNum - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let q2 = context.admin
      .from('bookings')
      .select('*, clients(full_name, email), packages(name)', { count: 'exact' })
      .eq('studio_id', context.studioId)

    if (status)   q2 = q2.eq('status', status)
    if (type)     q2 = q2.eq('session_type', type)
    if (category) q2 = q2.eq('shoot_type', category)
    if (date_from) q2 = q2.gte('session_date', date_from)
    if (date_to)   q2 = q2.lte('session_date', date_to + 'T23:59:59')

    if (clientIds !== null && clientIds.length === 0) {
      allTotal = 0
    } else {
      if (clientIds && clientIds.length > 0) q2 = q2.in('client_id', clientIds)
      const { data, count } = await q2.order('session_date', { ascending: false }).range(from, to)
      allSessions = (data ?? []) as unknown as SessionListRow[]
      allTotal    = count ?? 0
    }

    if (intakeStatus) {
      const { count } = await context.admin.from('bookings').select('*', { count: 'exact', head: true })
        .eq('studio_id', context.studioId).eq('status', intakeStatus)
      pendingCount = count ?? 0
    }
  }

  // ── "Pipeline" view data ───────────────────────────────────────
  let pipelineSessions: SessionListRow[] = []
  if (view === 'pipeline') {
    const { data } = await context.admin
      .from('bookings')
      .select('booking_id, booking_ref, session_type, shoot_type, session_date, status, clients(full_name)')
      .eq('studio_id', context.studioId)
      .not('status', 'in', excludeIn)
      .order('session_date', { ascending: true })
      .limit(300)
    pipelineSessions = (data ?? []) as unknown as SessionListRow[]
  }

  // ── "By category" view data ────────────────────────────────────
  let catSessions: SessionListRow[] = []
  if (view === 'by-category') {
    let catQ = context.admin
      .from('bookings')
      .select('booking_id, booking_ref, session_type, shoot_type, session_date, status, clients(full_name), packages(name)')
      .eq('studio_id', context.studioId)
      .not('status', 'in', cancelIn)
    if (date_from) catQ = catQ.gte('session_date', date_from)
    if (date_to)   catQ = catQ.lte('session_date', date_to + 'T23:59:59')
    const { data } = await catQ.order('session_date', { ascending: false }).limit(500)
    catSessions = (data ?? []) as unknown as SessionListRow[]
  }

  // ── "Needs action" view data ───────────────────────────────────
  let naData: {
    pending: SessionListRow[]
    noInvoice: SessionListRow[]
    noContract: SessionListRow[]
    selectionBacklog: SessionListRow[]
  } | null = null

  if (view === 'needs-action') {
    const [
      { data: activeRaw },
      { data: invoiceRows },
      { data: contractRows },
    ] = await Promise.all([
      context.admin
        .from('bookings')
        .select('booking_id, booking_ref, session_type, shoot_type, session_date, status, clients(full_name)')
        .eq('studio_id', context.studioId)
        .not('status', 'in', excludeIn)
        .order('session_date', { ascending: true }),
      context.admin
        .from('invoices')
        .select('booking_id, bookings!inner(studio_id)')
        .eq('bookings.studio_id', context.studioId),
      context.admin
        .from('contracts')
        .select('booking_id, bookings!inner(studio_id)')
        .eq('bookings.studio_id', context.studioId),
    ])
    const active = (activeRaw ?? []) as unknown as SessionListRow[]
    const invoicedIds  = new Set(((invoiceRows  ?? []) as unknown as { booking_id?: string | null }[]).map((r) => r.booking_id).filter(Boolean) as string[])
    const contractedIds = new Set(((contractRows ?? []) as unknown as { booking_id?: string | null }[]).map((r) => r.booking_id).filter(Boolean) as string[])

    naData = {
      pending:          intakeStatus ? active.filter(s => s.status === intakeStatus) : [],
      noInvoice:        active.filter(s => !invoicedIds.has(s.booking_id)),
      noContract:       active.filter(s => !contractedIds.has(s.booking_id)),
      selectionBacklog: selectionStatuses.length > 0
        ? active.filter(s => selectionStatuses.includes(s.status))
        : [],
    }
  }

  // ── Fetch distinct shoot_types for "All" category filter ──────
  const { data: typeRows } = view === 'all'
    ? await context.admin.from('bookings').select('shoot_type').eq('studio_id', context.studioId).not('shoot_type', 'is', null)
    : { data: null }
  const distinctCategories = [...new Set(((typeRows ?? []) as unknown as { shoot_type?: string | null }[]).map((r) => r.shoot_type).filter(Boolean) as string[])].sort()

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>Sessions</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/api/export/sessions" style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)', fontWeight: '500' }}>
            Export CSV
          </a>
          <Link href="/dashboard/sessions/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
            New session
          </Link>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
        {[
          { label: 'All time',       value: totalSessions    ?? 0 },
          { label: 'This month',     value: thisMonthCount   ?? 0 },
          { label: 'Active pipeline', value: pipelineCount   ?? 0 },
          { label: 'Cancelled / mo', value: cancelledThisMonth },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px', fontWeight: '600' }}>{s.label}</p>
            <p style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>{s.value}</p>
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
          {/* Pending banner */}
          {pendingCount > 0 && status !== intakeStatus && (
            <Link href={`/dashboard/sessions?view=all&status=${intakeStatus}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faeeda', border: '0.5px solid #e5c98a', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', textDecoration: 'none', color: '#854f0b' }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                🔔 {pendingCount} pending booking request{pendingCount !== 1 ? 's' : ''} waiting for review
              </span>
              <span style={{ fontSize: '13px' }}>Review →</span>
            </Link>
          )}

          {/* Filters + view switcher */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput defaultValue={q} placeholder="Search by client name…" />
            <DateRangeFilter defaultFrom={date_from} defaultTo={date_to} />
            <FilterSelect name="type" defaultValue={type} placeholder="All types"
              options={config.sessionTypes.map(t => ({ value: t.value, label: t.label }))} />
            <FilterSelect name="status" defaultValue={status} placeholder="All statuses"
              options={config.bookingStatuses.map(s => ({ value: s.value, label: s.label }))} />
            {distinctCategories.length > 0 && (
              <FilterSelect name="category" defaultValue={category} placeholder="All categories"
                options={distinctCategories.map(c => ({ value: c, label: c }))} />
            )}
            <div style={{ marginLeft: 'auto' }}>
              <ViewSwitcher modes={['list', 'grid']} storageKey="sessions-all" />
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 12px' }}>
            {allTotal} result{allTotal !== 1 ? 's' : ''}
          </p>

          {!allSessions.length ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>
                {q || status || type || category ? 'No sessions match your filters' : 'No sessions yet'}
              </p>
              <p style={{ fontSize: '13px', margin: 0 }}>
                {q || status || type || category ? 'Try adjusting your search or filters' : 'Create your first session to get started'}
              </p>
            </div>
          ) : sessionLayout === 'grid' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {allSessions.map((s) => {
                  const sc = getStatusConfig(config, s.status)
                  const tc = s.session_type ? getSessionTypeConfig(config, s.session_type) : null
                  return (
                    <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`}
                      style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', display: 'block', textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ height: '4px', background: sc.color_fg }} />
                      <div style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                          <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.clients?.full_name ?? '—'}
                          </p>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: sc.color_bg, color: sc.color_fg, fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {sc.label}
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 10px', fontFamily: 'monospace', letterSpacing: '0.01em' }}>
                          {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
                          {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--line-inner)' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{sDate(s.session_date)}</span>
                          {tc && (
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: tc.color_bg, color: tc.color_fg, fontWeight: '500' }}>
                              {tc.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              <Pagination
                page={pageNum}
                totalPages={Math.ceil(allTotal / PAGE_SIZE)}
                prevUrl={pageNum > 1 ? allPageUrl({ q, status, type, category, date_from, date_to }, pageNum - 1) : undefined}
                nextUrl={pageNum < Math.ceil(allTotal / PAGE_SIZE) ? allPageUrl({ q, status, type, category, date_from, date_to }, pageNum + 1) : undefined}
              />
            </>
          ) : (
            <>
              <BulkSessionList sessions={allSessions} />
              <Pagination
                page={pageNum}
                totalPages={Math.ceil(allTotal / PAGE_SIZE)}
                prevUrl={pageNum > 1 ? allPageUrl({ q, status, type, category, date_from, date_to }, pageNum - 1) : undefined}
                nextUrl={pageNum < Math.ceil(allTotal / PAGE_SIZE) ? allPageUrl({ q, status, type, category, date_from, date_to }, pageNum + 1) : undefined}
              />
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: PIPELINE
          ══════════════════════════════════════════════════════ */}
      {view === 'pipeline' && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            Active sessions grouped by workflow stage — {pipelineSessions.length} total
          </p>

          {pipelineSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>Pipeline is clear</p>
              <p style={{ fontSize: '13px', margin: 0 }}>No active sessions in progress right now</p>
            </div>
          ) : (
            (() => {
              // Group by status
              const byStatus = new Map<string, SessionListRow[]>()
              for (const s of pipelineSessions) {
                const arr = byStatus.get(s.status) ?? []
                arr.push(s)
                byStatus.set(s.status, arr)
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Segmented status distribution bar */}
                  <div>
                    <div style={{ display: 'flex', height: '8px', borderRadius: '6px', overflow: 'hidden', gap: '2px', marginBottom: '8px' }}>
                      {activeStatuses.map(sc => {
                        const cnt = (byStatus.get(sc.value) ?? []).length
                        if (!cnt) return null
                        return (
                          <div key={sc.value} title={`${sc.label}: ${cnt}`}
                            style={{ flex: cnt, minWidth: '6px', height: '100%', background: sc.color_fg, borderRadius: '3px' }} />
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      {activeStatuses.map(sc => {
                        const cnt = (byStatus.get(sc.value) ?? []).length
                        if (!cnt) return null
                        return (
                          <span key={sc.value} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-3)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.color_fg, display: 'inline-block', flexShrink: 0 }} />
                            {sc.label} <strong style={{ color: 'var(--text-2)' }}>{cnt}</strong>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  {activeStatuses.map(statusCfg => {
                    const group = byStatus.get(statusCfg.value) ?? []
                    if (!group.length) return null
                    return (
                      <div key={statusCfg.value}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: statusCfg.color_bg, color: statusCfg.color_fg, fontWeight: '600' }}>
                            {statusCfg.label}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: '500' }}>{group.length}</span>
                        </div>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                          {group.map((s, i) => (
                            <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '0.75rem 1.25rem', textDecoration: 'none', color: 'inherit', borderBottom: i < group.length - 1 ? '1px solid var(--line-inner)' : 'none' }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {s.clients?.full_name ?? '—'}
                                </p>
                                <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.01em' }}>
                                  {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
                                  {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                                </p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                {s.session_type && (() => {
                                  const tc = getSessionTypeConfig(config, s.session_type)
                                  return (
                                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: tc.color_bg, color: tc.color_fg, fontWeight: '500', whiteSpace: 'nowrap' }}>
                                      {tc.label}
                                    </span>
                                  )
                                })()}
                                <span style={{ fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                                  {sDate(s.session_date)}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: BY CATEGORY
          ══════════════════════════════════════════════════════ */}
      {view === 'by-category' && (
        <>
          {/* Date range filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <DateRangeFilter defaultFrom={date_from} defaultTo={date_to} />
            {(date_from || date_to) && (
              <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>
                {date_from && date_to
                  ? `${sDate(date_from)} – ${sDate(date_to)}`
                  : date_from ? `From ${sDate(date_from)}` : `Until ${sDate(date_to)}`}
              </span>
            )}
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            Sessions grouped by shoot category — {catSessions.length} total (excl. cancelled)
          </p>

          {catSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>
                {date_from || date_to ? 'No sessions in this date range' : 'No sessions yet'}
              </p>
            </div>
          ) : (
            (() => {
              // Group by shoot_type
              const byCat = new Map<string, SessionListRow[]>()
              const noCat: SessionListRow[] = []
              for (const s of catSessions) {
                if (!s.shoot_type) { noCat.push(s); continue }
                const arr = byCat.get(s.shoot_type) ?? []
                arr.push(s)
                byCat.set(s.shoot_type, arr)
              }
              // Sort by count desc
              const sorted = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)
              if (noCat.length) sorted.push(['No category', noCat])

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {sorted.map(([cat, group]) => {
                    // Date range for this category group
                    const dates = group.map(s => s.session_date).filter(Boolean) as string[]
                    const earliest = dates.length ? dates[dates.length - 1] : null
                    const latest   = dates.length ? dates[0] : null
                    const dateRange = earliest && latest && earliest !== latest
                      ? `${sDate(earliest)} – ${sDate(latest)}`
                      : earliest ? sDate(earliest) : null

                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-2)' }}>{cat}</span>
                          <span style={{ fontSize: '12px', padding: '1px 8px', borderRadius: '20px', background: 'var(--active)', color: 'var(--text-3)', fontWeight: '500' }}>{group.length}</span>
                          {dateRange && (
                            <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{dateRange}</span>
                          )}
                          <div style={{ flex: 1, maxWidth: '120px', height: '4px', background: 'var(--line)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${catSessions.length > 0 ? ((group.length / catSessions.length) * 100).toFixed(1) : 0}%`, background: 'var(--btn)', borderRadius: '2px' }} />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>
                            {catSessions.length > 0 ? Math.round((group.length / catSessions.length) * 100) : 0}%
                          </span>
                        </div>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                          {group.map((s, i) => {
                            const sc = getStatusConfig(config, s.status)
                            const tc = s.session_type ? getSessionTypeConfig(config, s.session_type) : null
                            return (
                              <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '0.75rem 1.25rem', textDecoration: 'none', color: 'inherit', borderBottom: i < group.length - 1 ? '1px solid var(--line-inner)' : 'none' }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {s.clients?.full_name ?? '—'}
                                  </p>
                                  <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.01em' }}>
                                    {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
                                    {s.packages?.name ? ` · ${s.packages.name}` : ''}
                                  </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                  {tc && (
                                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: tc.color_bg, color: tc.color_fg, fontWeight: '500', whiteSpace: 'nowrap' }}>
                                      {tc.label}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: sc.color_bg, color: sc.color_fg, fontWeight: '500', whiteSpace: 'nowrap' }}>
                                    {sc.label}
                                  </span>
                                  <span style={{ fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                                    {sDate(s.session_date)}
                                  </span>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: NEEDS ACTION
          ══════════════════════════════════════════════════════ */}
      {view === 'needs-action' && naData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* 1 — Pending requests */}
          <NeedsSection
            icon="🔔"
            title="Pending booking requests"
            subtitle="New bookings waiting for confirmation or cancellation"
            items={naData.pending}
            config={config}
            rightSlot={(s) => {
              const sc = getStatusConfig(config, s.status)
              return (
                <>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: sc.color_bg, color: sc.color_fg, fontWeight: '500' }}>{sc.label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{sDate(s.session_date)}</span>
                </>
              )
            }}
            emptyText="No pending requests"
          />

          {/* 2 — No invoice */}
          <NeedsSection
            icon="📄"
            title="No invoice yet"
            subtitle="Active sessions that haven't been invoiced"
            items={naData.noInvoice}
            config={config}
            rightSlot={(s) => (
              <>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{sDate(s.session_date)}</span>
                <Link href={`/dashboard/invoices/new?session=${s.booking_id}`}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none', padding: '3px 10px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--surface)', whiteSpace: 'nowrap' }}>
                  Create →
                </Link>
              </>
            )}
            emptyText="All active sessions have invoices"
          />

          {/* 3 — No contract */}
          <NeedsSection
            icon="📋"
            title="No contract yet"
            subtitle="Active sessions without a signed agreement"
            items={naData.noContract}
            config={config}
            rightSlot={(s) => (
              <>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{sDate(s.session_date)}</span>
                <Link href={`/dashboard/contracts/new?session=${s.booking_id}`}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none', padding: '3px 10px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--surface)', whiteSpace: 'nowrap' }}>
                  Create →
                </Link>
              </>
            )}
            emptyText="All active sessions have contracts"
          />

          {/* 4 — Selection backlog */}
          {selectionStatuses.length > 0 && (
            <NeedsSection
              icon="⏳"
              title="Selection backlog"
              subtitle="Sessions waiting on client photo selections"
              items={naData.selectionBacklog}
              config={config}
              rightSlot={(s) => {
                const sc = getStatusConfig(config, s.status)
                return (
                  <>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: sc.color_bg, color: sc.color_fg, fontWeight: '500' }}>{sc.label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{sDate(s.session_date)}</span>
                  </>
                )
              }}
              emptyText="No selection backlog"
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── NeedsSection helper ─────────────────────────────────────────
function NeedsSection({
  icon, title, subtitle, items, config, rightSlot, emptyText,
}: {
  icon: string
  title: string
  subtitle: string
  items: SessionListRow[]
  config: StudioConfig
  rightSlot: (s: SessionListRow) => React.ReactNode
  emptyText: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '15px' }}>{icon}</span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{title}</span>
        {items.length > 0 && (
          <span style={{ fontSize: '12px', padding: '1px 8px', borderRadius: '20px', background: 'var(--active)', color: 'var(--text-3)', fontWeight: '500' }}>{items.length}</span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 10px' }}>{subtitle}</p>

      {items.length === 0 ? (
        <div style={{ padding: '1rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>✓ {emptyText}</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          {items.map((s, i) => (
            <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '0.75rem 1.25rem', textDecoration: 'none', color: 'inherit', borderBottom: i < items.length - 1 ? '1px solid var(--line-inner)' : 'none' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.clients?.full_name ?? '—'}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.01em' }}>
                  {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
                  {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {rightSlot(s)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
