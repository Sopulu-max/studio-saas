import Link from 'next/link'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'
import { sessionName } from '@/lib/session-title'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

// ─── Types ─────────────────────────────────────────────────────────────────

type ContractListRow = {
  contract_id:  string
  created_at?:  string | null
  signed_by?:   string | null
  status:       string
  bookings?: {
    booking_id?:   string | null
    booking_ref?:  number | null
    session_date?: string | null
    session_type?: string | null
    clients?: { full_name?: string | null } | null
  } | null
}

type BookingRow = {
  booking_id:    string
  booking_ref?:  number | null
  session_date?: string | null
  session_type?: string | null
  status:        string
  clients?: { full_name?: string | null } | null
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:  { bg: '#f1efe8', color: '#5f5e5a' },
  sent:   { bg: '#e6f1fb', color: '#185fa5' },
  signed: { bg: '#eaf3de', color: '#3b6d11' },
  void:   { bg: '#fcebeb', color: '#a32d2d' },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pageUrl(params: Record<string, string | undefined>, pg: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', String(pg))
  return `/dashboard/contracts?${p}`
}

function tabUrl(view: string) {
  return `/dashboard/contracts?view=${view}`
}

function sDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysSince(date: string | null | undefined): number {
  if (!date) return 0
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
}

// ─── Component helpers ──────────────────────────────────────────────────────

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'all',              label: 'All' },
    { key: 'needs-signature',  label: 'Needs signature' },
    { key: 'no-contract',      label: 'No contract' },
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

function StatsStrip({ items }: { items: { label: string; value: string | number; accent?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '12px', marginBottom: '1.5rem' }}>
      {items.map(item => (
        <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
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

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ContractsPage({
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

  const studioRow = await fetchStudio(context.admin, context.studioId)
  const config    = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  // Terminal statuses — exclude from "active sessions" query in No contract view
  const terminalValues = config.bookingStatuses.filter(s => s.is_terminal).map(s => s.value)
  const excludeIn      = terminalValues.length ? `(${terminalValues.map(v => `"${v}"`).join(',')})` : '("__none__")'

  // ── Stats (always fetched in parallel) ───────────────────────────
  const [
    { count: totalContracts },
    { count: signedCount },
    { count: sentCount },
    { count: voidCount },
  ] = await Promise.all([
    context.admin.from('contracts')
      .select('*, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', context.studioId),
    context.admin.from('contracts')
      .select('*, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', context.studioId).eq('status', 'signed'),
    context.admin.from('contracts')
      .select('*, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', context.studioId).eq('status', 'sent'),
    context.admin.from('contracts')
      .select('*, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', context.studioId).eq('status', 'void'),
  ])

  const total     = totalContracts ?? 0
  const signed    = signedCount ?? 0
  const awaiting  = sentCount ?? 0
  const voided    = voidCount ?? 0
  const signRate  = total > 0 ? Math.round((signed / total) * 100) : 0

  const statsItems = [
    { label: 'Total contracts',      value: total },
    { label: 'Signed',               value: signed,   accent: '#3b6d11' },
    { label: 'Awaiting signature',   value: awaiting, accent: '#854f0b' },
    { label: 'Void',                 value: voided,   accent: '#a32d2d' },
    { label: 'Sign rate',            value: `${signRate}%` },
  ]

  // ── Header ───────────────────────────────────────────────────────
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>Contracts</h1>
      <Link href="/dashboard/contracts/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
        New contract
      </Link>
    </div>
  )

  // ── Needs signature view ─────────────────────────────────────────
  if (view === 'needs-signature') {
    const { data: raw } = await context.admin
      .from('contracts')
      .select('contract_id, created_at, signed_by, status, bookings!inner(booking_id, booking_ref, session_date, session_type, clients(full_name), studio_id)')
      .eq('bookings.studio_id', context.studioId)
      .eq('status', 'sent')
      .order('created_at', { ascending: true })
      .limit(200)
    const contracts = (raw ?? []) as unknown as ContractListRow[]

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="needs-signature" />

        {!contracts.length ? (
          <EmptyState message="No contracts awaiting signature" sub="All sent contracts have been signed" />
        ) : (
          <AnimatedList style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
              <span>Session</span><span>Sent on</span><span>Days waiting</span><span></span>
            </div>

            {contracts.map((c, i) => {
              const days   = daysSince(c.created_at)
              const urgent = days >= 7
              return (
                <AnimatedItem key={c.contract_id} delay={i * 0.05}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px',
                    padding: '1rem 1.25rem', alignItems: 'center',
                    borderBottom: i < contracts.length - 1 ? '1px solid var(--line-inner)' : 'none',
                  }}>
                    <Link href={`/dashboard/contracts/${c.contract_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.bookings?.clients?.full_name ?? '—'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {sessionName(c.bookings?.clients?.full_name, c.bookings?.booking_ref, c.bookings?.booking_id, c.bookings?.session_date)}
                      </p>
                    </Link>

                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{sDate(c.created_at)}</p>

                    <p style={{ fontSize: '13px', margin: 0, fontWeight: urgent ? '600' : '400', color: urgent ? '#a32d2d' : 'var(--text-3)' }}>
                      {days}d{urgent ? ' ⚠' : ''}
                    </p>

                    <Link href={`/dashboard/contracts/${c.contract_id}`} style={{ fontSize: '13px', color: 'var(--text-3)', textDecoration: 'none', fontWeight: '500' }}>
                      View →
                    </Link>
                  </div>
                </AnimatedItem>
              )
            })}
          </AnimatedList>
        )}
      </div>
    )
  }

  // ── No contract view ─────────────────────────────────────────────
  if (view === 'no-contract') {
    const [{ data: activeRaw }, { data: contractedRaw }] = await Promise.all([
      context.admin
        .from('bookings')
        .select('booking_id, booking_ref, session_date, session_type, status, clients(full_name)')
        .eq('studio_id', context.studioId)
        .not('status', 'in', excludeIn)
        .order('session_date', { ascending: false })
        .limit(500),
      context.admin
        .from('contracts')
        .select('booking_id, bookings!inner(studio_id)')
        .eq('bookings.studio_id', context.studioId),
    ])

    const activeBookings = (activeRaw ?? []) as unknown as BookingRow[]
    const contractedIds  = new Set(
      ((contractedRaw ?? []) as unknown as { booking_id?: string | null }[]).map((r) => r.booking_id).filter(Boolean)
    )
    const noContract = activeBookings.filter(b => !contractedIds.has(b.booking_id))

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="no-contract" />

        {!noContract.length ? (
          <EmptyState
            message="All active sessions have contracts"
            sub="Good work — no sessions are missing contract coverage"
          />
        ) : (
          <>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
              {noContract.length} active session{noContract.length !== 1 ? 's' : ''} without a contract
            </p>
            <AnimatedList style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                <span>Session</span><span>Type</span><span>Date</span><span></span>
              </div>

              {noContract.map((b, i) => (
                <AnimatedItem key={b.booking_id} delay={i * 0.05}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px',
                    padding: '1rem 1.25rem', alignItems: 'center',
                    borderBottom: i < noContract.length - 1 ? '1px solid var(--line-inner)' : 'none',
                  }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.clients?.full_name ?? '—'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {sessionName(b.clients?.full_name, b.booking_ref, b.booking_id, b.session_date)}
                      </p>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{b.session_type ?? '—'}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{sDate(b.session_date)}</p>

                    <Link
                      href={`/dashboard/contracts/new?booking_id=${b.booking_id}`}
                      style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500', textDecoration: 'none' }}
                    >
                      Create →
                    </Link>
                  </div>
                </AnimatedItem>
              ))}
            </AnimatedList>
          </>
        )}
      </div>
    )
  }

  // ── All view (default) ───────────────────────────────────────────
  let q = context.admin
    .from('contracts')
    .select('contract_id, created_at, signed_by, status, bookings!inner(booking_id, booking_ref, session_date, session_type, clients(full_name), studio_id)', { count: 'exact' })
    .eq('bookings.studio_id', context.studioId)

  if (status) q = q.eq('status', status)

  const { data: contractsRaw, count: filteredCount } = await q
    .order('created_at', { ascending: false })
    .range(from, to)
  const contracts   = (contractsRaw ?? []) as unknown as ContractListRow[]
  const listTotal   = filteredCount ?? 0
  const totalPages  = Math.ceil(listTotal / PAGE_SIZE)
  const prevUrl     = pageNum > 1          ? pageUrl({ view: 'all', status }, pageNum - 1) : undefined
  const nextUrl     = pageNum < totalPages ? pageUrl({ view: 'all', status }, pageNum + 1) : undefined

  return (
    <div>
      {header}
      <StatsStrip items={statsItems} />
      <TabNav active="all" />

      {/* Filters */}
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

      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
        {listTotal} result{listTotal !== 1 ? 's' : ''}
      </p>

      {!contracts.length ? (
        <EmptyState
          message={status ? 'No contracts match your filter' : 'No contracts yet'}
          sub={status ? 'Try a different status filter' : 'Create a contract for a booking to get client sign-off'}
        />
      ) : (
        <AnimatedList style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
            <span>Session</span><span>Date</span><span>Signed by</span><span>Status</span>
          </div>

          {contracts.map((c, i) => {
            const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS.draft
            return (
              <AnimatedItem key={c.contract_id} delay={i * 0.05}>
                <Link href={`/dashboard/contracts/${c.contract_id}`} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                  borderBottom: i < contracts.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.bookings?.clients?.full_name ?? '—'}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                      {sessionName(c.bookings?.clients?.full_name, c.bookings?.booking_ref, c.bookings?.booking_id, c.bookings?.session_date)}
                    </p>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{sDate(c.created_at)}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{c.signed_by ?? '—'}</p>
                  <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, fontWeight: '500', textTransform: 'capitalize' }}>
                    {c.status}
                  </span>
                </Link>
              </AnimatedItem>
            )
          })}

          <Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
        </AnimatedList>
      )}
    </div>
  )
}
